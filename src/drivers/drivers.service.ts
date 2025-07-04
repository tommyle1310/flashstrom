import { Injectable, Logger } from '@nestjs/common';
import { CreateDriverDto, UpdateVehicleDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './entities/driver.entity';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { Type_Delivery_Order } from 'src/types/Driver';
import { calculateDistance } from 'src/utils/commonFunctions';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { DriversRepository } from './drivers.repository';
import { Order, OrderStatus } from 'src/orders/entities/order.entity';
import { OrdersRepository } from 'src/orders/orders.repository';
import { DataSource, EntityManager, Repository, Between } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DriverProgressStagesRepository } from 'src/driver_progress_stages/driver_progress_stages.repository';
import { OnlineSessionsService } from 'src/online-sessions/online-sessions.service';
import { CreateOnlineSessionDto } from 'src/online-sessions/dto/create-online-session.dto';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
import { RatingsReviewsRepository } from 'src/ratings_reviews/ratings_reviews.repository';
import { createClient } from 'redis';
import { ToggleDriverAvailabilityDto } from './dto/driver-availability.dto';
import { OnlineSession } from 'src/online-sessions/entities/online-session.entity';
import * as dotenv from 'dotenv';
import { RedisService } from 'src/redis/redis.service';
// import { In } from 'typeorm';
// import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
import { DRIVER_MOCK } from 'src/utils/constants';
import { NotificationsRepository } from 'src/notifications/notifications.repository';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';

dotenv.config();

const logger = new Logger('DriversService');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));

// interface DriverWithBanStatus extends Omit<Driver, 'generateId'> {
//   is_banned: boolean;
// }

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    @InjectRepository(Driver)
    private driverEntityRepository: Repository<Driver>,
    private readonly ordersRepository: OrdersRepository,
    @InjectRepository(Order)
    private readonly orderServiceRepository: Repository<Order>,
    private readonly driverStatsService: DriverStatsService,
    private readonly addressRepository: AddressBookRepository,
    private readonly driverProgressStageRepository: DriverProgressStagesRepository,
    @InjectRepository(DriverProgressStage)
    private readonly driverProgressStageServiceRepository: Repository<DriverProgressStage>,
    private readonly onlineSessionsService: OnlineSessionsService,
    private readonly dataSource: DataSource,
    private readonly ratingsReviewsRepository: RatingsReviewsRepository,
    private readonly redisService: RedisService,
    private readonly notificationsRepository: NotificationsRepository
  ) {}

  async onModuleInit() {
    await this.preloadDrivers();
  }

  async preloadDrivers() {
    try {
      const start = Date.now();
      const drivers = await this.driverEntityRepository.find({
        select: ['id', 'available_for_work'],
        take: 10 // Giảm để tránh vượt quota Upstash
      });
      const batchSize = 1000;
      for (let i = 0; i < drivers.length; i += batchSize) {
        const batch = drivers.slice(i, i + batchSize);
        await Promise.all(
          batch.map(driver => {
            const cacheKey = `driver:${driver.id}`;
            return redis.setEx(cacheKey, 86400, JSON.stringify(driver));
          })
        );
      }
      logger.log(
        `Preloaded ${drivers.length} drivers into Redis in ${Date.now() - start}ms`
      );
    } catch (error: any) {
      logger.error('Error preloading drivers into Redis:', error);
    }
  }

  async clearRedis(): Promise<ApiResponse<null>> {
    const start = Date.now();
    try {
      const keys = await redis.keys('*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
      logger.log(
        `Cleared ${keys.length} keys from Redis in ${Date.now() - start}ms`
      );
      await this.preloadDrivers();
      return createResponse(
        'OK',
        null,
        'Redis cleared and drivers preloaded successfully'
      );
    } catch (error: any) {
      logger.error('Error clearing Redis:', error);
      return createResponse('ServerError', null, 'Error clearing Redis');
    }
  }

  async toggleAvailability(
    id: string,
    toggleDto: ToggleDriverAvailabilityDto
  ): Promise<ApiResponse<Driver>> {
    const start = Date.now();
    try {
      const cacheKey = `driver:${id}`;
      let driver: Driver | null = null;

      const fetchStart = Date.now();
      const cached = await redis.get(cacheKey);
      if (cached) {
        driver = JSON.parse(cached);
        logger.log(`Fetch driver (cache) took ${Date.now() - fetchStart}ms`);
      } else {
        driver = await this.driversRepository.findById(id);
        if (driver) {
          await redis.setEx(cacheKey, 86400, JSON.stringify(driver));
          logger.log(`Stored driver in Redis: ${cacheKey}`);
        }
        logger.log(`Fetch driver took ${Date.now() - fetchStart}ms`);
      }

      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      const newAvailability =
        toggleDto.available_for_work ?? !driver.available_for_work;
      const updateStart = Date.now();
      const updateResult = await this.dataSource
        .createQueryBuilder()
        .update(Driver)
        .set({ available_for_work: newAvailability })
        .where('id = :id', { id })
        .execute();

      if (updateResult.affected === 0) {
        logger.warn(`Failed to update driver ${id}`);
        return createResponse('NotFound', null, 'Driver not found');
      }
      logger.log(
        `Update driver availability took ${Date.now() - updateStart}ms`
      );

      const sessionCacheKey = `online_session:${id}`;
      if (newAvailability) {
        const sessionStart = Date.now();
        // End all active sessions
        const activeSessions = await this.dataSource
          .getRepository(OnlineSession)
          .createQueryBuilder('session')
          .where(
            'session.driver_id = :driverId AND session.is_active = :isActive',
            {
              driverId: id,
              isActive: true
            }
          )
          .getMany();
        for (const session of activeSessions) {
          await this.onlineSessionsService.endSession(session.id);
        }

        const cachedSession = await redis.get(sessionCacheKey);
        if (!cachedSession) {
          const createOnlineSessionDto: CreateOnlineSessionDto = {
            driver_id: id,
            end_time: null,
            start_time: Math.floor(Date.now() / 1000),
            is_active: true
          };
          const session = await this.onlineSessionsService.create(
            createOnlineSessionDto
          );
          await redis.setEx(sessionCacheKey, 86400, JSON.stringify(session));
          logger.log(
            `Create online session took ${Date.now() - sessionStart}ms`
          );
        } else {
          logger.log(
            `Online session (cache) took ${Date.now() - sessionStart}ms`
          );
        }
      } else {
        const sessionStart = Date.now();
        const activeSessions = await this.dataSource
          .getRepository(OnlineSession)
          .createQueryBuilder('session')
          .where(
            'session.driver_id = :driverId AND session.is_active = :isActive',
            {
              driverId: id,
              isActive: true
            }
          )
          .select(['session.id'])
          .getMany();
        for (const session of activeSessions) {
          await this.onlineSessionsService.endSession(session.id);
        }
        await redis.del(sessionCacheKey);
        logger.log(`End online session took ${Date.now() - sessionStart}ms`);
      }

      this.driverStatsService
        .updateStatsForDriver(id, 'daily')
        .catch(err => logger.error('Error updating stats:', err));

      driver.available_for_work = newAvailability;
      await redis.setEx(cacheKey, 86400, JSON.stringify(driver));

      logger.log(`Toggle driver availability took ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        driver,
        'Driver availability toggled successfully'
      );
    } catch (error: any) {
      logger.error('Error toggling driver availability:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while toggling driver availability'
      );
    }
  }

  async create(createDriverDto: CreateDriverDto): Promise<ApiResponse<Driver>> {
    try {
      const existingDriver = await this.driversRepository.findByUserId(
        createDriverDto.user_id
      );
      if (existingDriver) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Driver with this user ID already exists'
        );
      }

      const newDriver = await this.driversRepository.create(createDriverDto);
      return createResponse('OK', newDriver, 'Driver created successfully');
    } catch (error: any) {
      console.error('Error creating driver:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the driver'
      );
    }
  }

  async findAll(): Promise<ApiResponse<any>> {
    try {
      const drivers = await this.driversRepository.findAll();
      const driversWithBanStatus = drivers.map(driver => ({
        ...driver,
        is_banned: (driver as any).driver_is_banned || false
      }));
      console.log('hcekc what this', drivers);
      return createResponse('OK', driversWithBanStatus, 'Fetched all drivers');
    } catch (error: any) {
      return this.handleError('Error fetching drivers:', error);
    }
  }

  async findDriverById(id: string): Promise<ApiResponse<any>> {
    try {
      const driver = await this.driversRepository.findById(id);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }
      const driverWithBanStatus = {
        ...driver,
        is_banned: (driver as any).driver_is_banned || false
      };
      return createResponse(
        'OK',
        driverWithBanStatus,
        'Driver retrieved successfully'
      );
    } catch (error: any) {
      console.error('Error finding driver:', error);
      return createResponse('ServerError', null, 'Error retrieving driver');
    }
  }

  async findOne(conditions: object): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findOne(conditions);
      return this.handleDriverResponse(driver);
    } catch (error: any) {
      return this.handleError('Error fetching driver:', error);
    }
  }

  async update(
    id: string,
    updateDriverDto: UpdateDriverDto
  ): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findById(id);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      const updatedDriver = await this.driversRepository.update(
        id,
        updateDriverDto
      );
      return createResponse('OK', updatedDriver, 'Driver updated successfully');
    } catch (error: any) {
      return this.handleError('Error updating driver:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedDriver = await this.driversRepository.remove(id);
      if (!deletedDriver) {
        return createResponse('NotFound', null, 'Driver not found');
      }
      return createResponse('OK', null, 'Driver deleted successfully');
    } catch (error: any) {
      return this.handleError('Error deleting driver:', error);
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string
  ): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findById(entityId);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      driver.avatar = { url: uploadResult.url, key: uploadResult.public_id };
      const savedDriver = await this.driversRepository.save(driver);
      return this.handleDriverResponse(savedDriver);
    } catch (error: any) {
      return this.handleError('Error updating driver avatar:', error);
    }
  }

  async prioritizeAndAssignDriver(
    listAvailableDrivers: Array<{
      id: string;
      location: { lng: number; lat: number };
      active_points?: number;
      current_order_id?: string[];
    }>,
    orderDetails: Type_Delivery_Order
  ): Promise<ApiResponse<any>> {
    try {
      console.log('check what here ', listAvailableDrivers, orderDetails);
      if (!listAvailableDrivers?.length) {
        return createResponse('NoDrivers', [], 'No available drivers found');
      }

      const restaurantLocation = await this.getRestaurantLocation(
        orderDetails.restaurant_location
      );
      console.log('cehc k', restaurantLocation);
      if (!restaurantLocation) {
        return createResponse(
          'NotFound',
          null,
          'Restaurant location not found'
        );
      }

      // Tìm driver ưu tiên từ danh sách
      const specificDriver = listAvailableDrivers.find(
        driver => driver.id === DRIVER_MOCK.driver_id
      );
      if (!specificDriver) {
        return createResponse(
          'NotFound',
          [],
          'Prioritized driver not found in available list'
        );
      }

      // Lấy driver từ repository, bao gồm quan hệ current_orders
      const driver = await this.driverEntityRepository.findOne({
        where: { id: specificDriver.id },
        relations: ['current_orders'] // Populate quan hệ current_orders
      });
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found in database');
      }
      if (driver.current_orders.length > 3) {
        return createResponse(
          'DRIVER_MAXIMUM_ORDER',
          null,
          'Driver has too many current orders'
        );
      }
      console.log('check drivererast', driver);

      // Trả về driver (bao gồm current_orders)
      const driverResult = driver ? [driver] : [];
      return createResponse('OK', driverResult, 'Driver selected successfully');
    } catch (error: any) {
      return this.handleError('Error prioritizing drivers:', error);
    }
  }

  async updateDriverDeliveryStatus(
    driverId: string,
    orderId: Order['id'],
    status: boolean
  ): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findById(driverId, {
        relations: ['current_orders']
      });
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      const updateData: UpdateDriverDto = {
        is_on_delivery: status,
        created_at: driver.created_at,
        updated_at: Math.floor(Date.now() / 1000),
        last_login: driver.last_login
      };

      if (status) {
        const newOrder = new Order();
        newOrder.id = orderId;
        updateData.current_orders = [
          ...(driver.current_orders || []),
          newOrder
        ];
        updateData.active_points = (driver.active_points || 0) + 1;
      } else {
        updateData.current_orders = (driver.current_orders || []).filter(
          order => order.id !== orderId
        );
      }

      const updatedDriver = await this.driversRepository.update(
        driverId,
        updateData
      );
      return createResponse(
        'OK',
        updatedDriver,
        'Driver status updated successfully'
      );
    } catch (error: any) {
      console.error('Error updating driver delivery status:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating driver status'
      );
    }
  }

  async updateDriverOrder(driverId: string, orderIds: string[]): Promise<void> {
    const driver = await this.driversRepository.findById(driverId, {
      relations: ['current_orders']
    });
    if (driver) {
      const orders = await Promise.all(
        orderIds.map(id => this.ordersRepository.findById(id))
      );
      driver.current_orders = orders.filter(order => order !== null);
      await this.driversRepository.save(driver);
    }
  }

  async addOrderToDriver(
    driverId: string,
    orderId: string,
    restaurantLocation: { lat: number; lng: number },
    transactionalEntityManager?: EntityManager
  ): Promise<ApiResponse<Driver>> {
    try {
      console.log(
        'Starting addOrderToDriver with driverId:',
        driverId,
        'orderId:',
        orderId
      );
      const startTime = Date.now();

      const manager = transactionalEntityManager || this.dataSource.manager;

      // Fetch driver một lần duy nhất
      console.log('addOrderToDriver - Fetching driver: START');
      const driver = await manager.findOne(Driver, {
        where: { id: driverId },
        relations: ['user']
      });
      console.log(
        'addOrderToDriver - Fetching driver: END, Time:',
        Date.now() - startTime,
        'ms'
      );
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      // Tính điểm và khoảng cách
      console.log('addOrderToDriver - Calculating points and distance: START');
      const driverLat = driver.current_location?.lat || 10.826411;
      const driverLng = driver.current_location?.lng || 106.617353;
      const restLat = restaurantLocation.lat || 0;
      const restLng = restaurantLocation.lng || 0;

      const points = this.calculateActivePoints(
        driverLat,
        driverLng,
        restLat,
        restLng
      );
      const distance = calculateDistance(
        driverLat,
        driverLng,
        restLat,
        restLng
      );
      console.log(
        'addOrderToDriver - Calculating points and distance: END, Points:',
        points,
        'Distance:',
        distance,
        'Time:',
        Date.now() - startTime,
        'ms'
      );

      // Cập nhật driver
      console.log('addOrderToDriver - Updating driver: START');
      driver.active_points = (driver.active_points || 0) + points;
      driver.is_on_delivery = true;
      driver.updated_at = Math.floor(Date.now() / 1000);
      await manager.save(Driver, driver);
      console.log(
        'addOrderToDriver - Updating driver: END, Time:',
        Date.now() - startTime,
        'ms'
      );

      // Cập nhật order distance
      if (distance) {
        console.log('addOrderToDriver - Updating order distance: START');
        await manager
          .createQueryBuilder()
          .update(Order)
          .set({ distance: distance.toString() })
          .where('id = :id', { id: orderId })
          .execute();
        console.log(
          'addOrderToDriver - Updating order distance: END, Time:',
          Date.now() - startTime,
          'ms'
        );
      }

      console.log(
        'addOrderToDriver - Complete, Total Time:',
        Date.now() - startTime,
        'ms'
      );
      return createResponse('OK', driver, 'Driver updated successfully');
    } catch (error: any) {
      console.error('Error in addOrderToDriver:', error);
      return this.handleError('Error updating driver:', error);
    }
  }

  // Giả sử các hàm helper
  private calculateActivePoints(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    // Logic đơn giản, có thể tối ưu dựa trên khoảng cách
    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    return distance > 10000 ? 20 : 10; // Ví dụ: 10 điểm nếu < 10km, 20 nếu > 10km
  }

  private handleDriverResponse(driver: Driver | null): ApiResponse<Driver> {
    if (!driver) {
      return createResponse('NotFound', null, 'Driver not found');
    }
    return createResponse('OK', driver, 'Driver retrieved successfully');
  }

  private async getRestaurantLocation(
    location: { lat: number; lng: number } | string
  ): Promise<any> {
    if (typeof location === 'string') {
      const response = await this.addressRepository.findById(location);
      return response ? response.location : null;
    }
    return location;
  }

  private calculateDriverPriorities(
    drivers: any[],
    restaurantLocation: any
  ): any[] {
    return drivers
      .map(driver => ({
        ...driver,
        distance: calculateDistance(
          driver.location.lat,
          driver.location.lng,
          restaurantLocation.lat,
          restaurantLocation.lng
        ),
        active_points: driver.active_points || 0,
        current_orders: driver.current_orders || []
      }))
      .sort((a, b) => this.compareDriverPriorities(a, b));
  }

  private compareDriverPriorities(a: any, b: any): number {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.active_points !== b.active_points)
      return b.active_points - a.active_points;
    return (a.current_orders?.length || 0) - (b.current_orders?.length || 0);
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    console.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
  async updateVehicleImages(
    uploadResults: Array<{ key: string; url: string }>,
    entityId: string
  ) {
    try {
      const driver = await this.driversRepository.findById(entityId);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      const updatedDriver = await this.driversRepository.updateVehicleImages(
        entityId,
        uploadResults
      );

      return createResponse(
        'OK',
        updatedDriver,
        'Driver vehicle images updated successfully'
      );
    } catch (error: any) {
      console.error('Error updating driver vehicle images:', error);
      return createResponse(
        'ServerError',
        null,
        'Failed to update vehicle images'
      );
    }
  }

  async updateVehicle(
    driverId: string,
    updateVehicleDto: UpdateVehicleDto
  ): Promise<ApiResponse<Driver>> {
    try {
      // Tìm driver
      const driver = await this.driversRepository.findById(driverId);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      // Khởi tạo vehicle nếu chưa có
      if (!driver.vehicle) {
        driver.vehicle = {
          license_plate: '',
          model: '',
          color: '',
          images: [],
          brand: '',
          owner: '',
          year: 2000
        };
      }

      // Cập nhật các trường trong vehicle (không chạm đến images)
      const updatedVehicle = {
        ...driver.vehicle,
        license_plate:
          updateVehicleDto.license_plate ?? driver.vehicle.license_plate,
        model: updateVehicleDto.model ?? driver.vehicle.model,
        color: updateVehicleDto.color ?? driver.vehicle.color,
        brand: updateVehicleDto.brand ?? driver.vehicle.brand,
        owner: updateVehicleDto.owner ?? driver.vehicle.owner,
        year: updateVehicleDto.year ?? driver.vehicle.year,
        images: driver.vehicle.images // Giữ nguyên images
      };
      console.log(
        'check update vehicle',
        updatedVehicle,
        '----',
        updateVehicleDto
      );
      // Cập nhật driver với vehicle mới
      const updateData: Partial<Driver> = {
        vehicle: updatedVehicle,
        updated_at: Math.floor(Date.now() / 1000)
      };

      const updatedDriver = await this.driversRepository.update(
        driverId,
        updateData
      );

      return createResponse(
        'OK',
        updatedDriver,
        'Driver vehicle updated successfully'
      );
    } catch (error: any) {
      console.error('Error updating driver vehicle:', error);
      return createResponse(
        'ServerError',
        null,
        'Failed to update driver vehicle'
      );
    }
  }

  async getAllDriverProgressStages({
    driverId,
    limit,
    offset
  }: {
    driverId: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const dps = await this.driverProgressStageRepository.getAllByDriverId(
        driverId,
        offset,
        limit
      );
      return createResponse('OK', dps, 'Fetched all dps');
    } catch (error: any) {
      return this.handleError('Error fetching dps:', error);
    }
  }

  async formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  async getDriverRatingsReviews(driverId: string): Promise<ApiResponse<any>> {
    try {
      const driver = await this.driversRepository.findById(driverId);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      const ratingsReviews = await this.ratingsReviewsRepository.findAll({
        where: {
          rr_recipient_driver_id: driverId,
          recipient_type: 'driver'
        },
        relations: ['reviewer_customer', 'reviewer_restaurant', 'order']
      });

      // Calculate average ratings
      const totalReviews = ratingsReviews.length;
      const totalFoodRating = ratingsReviews.reduce(
        (sum, review) => sum + review.food_rating,
        0
      );
      const totalDeliveryRating = ratingsReviews.reduce(
        (sum, review) => sum + review.delivery_rating,
        0
      );
      const averageFoodRating =
        totalReviews > 0 ? totalFoodRating / totalReviews : 0;
      const averageDeliveryRating =
        totalReviews > 0 ? totalDeliveryRating / totalReviews : 0;

      const response = {
        driver_id: driverId,
        total_reviews: totalReviews,
        average_food_rating: averageFoodRating,
        average_delivery_rating: averageDeliveryRating,
        reviews: ratingsReviews.map(review => ({
          id: review.id,
          reviewer_type: review.reviewer_type,
          reviewer:
            review.reviewer_type === 'customer'
              ? review.reviewer_customer
              : review.reviewer_restaurant,
          food_rating: review.food_rating,
          delivery_rating: review.delivery_rating,
          food_review: review.food_review,
          delivery_review: review.delivery_review,
          images: review.images,
          created_at: review.created_at,
          order_id: review.order_id
        }))
      };

      return createResponse(
        'OK',
        response,
        'Driver ratings and reviews retrieved successfully'
      );
    } catch (error: any) {
      console.error('Error getting driver ratings and reviews:', error);
      return createResponse(
        'ServerError',
        null,
        'Error retrieving driver ratings and reviews'
      );
    }
  }

  async getAllOrders(driverId: string): Promise<ApiResponse<any>> {
    const cacheKey = `driver:notifications:${driverId}`;
    const cacheTtl = 300; // 5 minutes (notifications change frequently)
    const start = Date.now();

    try {
      // Try to get from cache first
      const cacheStart = Date.now();
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(
          `Cache hit for driver notifications ${driverId} in ${Date.now() - cacheStart}ms`
        );
        logger.log(`Total time (cache): ${Date.now() - start}ms`);
        const cachedNotifications = JSON.parse(cachedData);
        return createResponse(
          'OK',
          cachedNotifications,
          `Fetched ${cachedNotifications.length} notifications from cache for driver ${driverId}`
        );
      }

      logger.log(`Cache miss for driver notifications: ${driverId}`);

      // Kiểm tra driver có tồn tại không
      const driverStart = Date.now();
      const driver = await this.driversRepository.findById(driverId);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }
      logger.log(`Driver validation took ${Date.now() - driverStart}ms`);

      // Fetch notifications in parallel for better performance
      const notificationsStart = Date.now();
      const [specificNotifications, broadcastNotifications] = await Promise.all(
        [
          // Lấy thông báo chỉ định riêng cho driver (target_user_id = driverId)
          this.notificationsRepository.findSpecificNotifications(driverId),
          // Lấy thông báo broadcast cho vai trò DRIVER
          this.notificationsRepository.findBroadcastNotifications('DRIVER')
        ]
      );
      logger.log(
        `Notifications fetch took ${Date.now() - notificationsStart}ms`
      );

      logger.log('Fetching broadcast notifications for DRIVER...');
      logger.log(
        `Found ${broadcastNotifications.length} broadcast notifications`
      );

      // Process notifications
      const processingStart = Date.now();
      // Gộp hai danh sách thông báo và loại bỏ trùng lặp
      const allNotifications = [
        ...specificNotifications,
        ...broadcastNotifications
      ];
      const uniqueNotificationsMap = new Map(
        allNotifications.map(n => [n.id, n])
      );
      const uniqueNotifications = Array.from(uniqueNotificationsMap.values());

      // Sắp xếp theo thời gian tạo (mới nhất trước)
      const sortedNotifications = uniqueNotifications.sort(
        (a, b) => b.created_at - a.created_at
      );
      logger.log(
        `Notifications processing took ${Date.now() - processingStart}ms`
      );

      // Cache the result
      const cacheSaveStart = Date.now();
      try {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(sortedNotifications),
          cacheTtl * 1000
        );
        logger.log(
          `Notifications cached successfully (${Date.now() - cacheSaveStart}ms)`
        );
      } catch (cacheError) {
        logger.warn('Failed to cache notifications:', cacheError);
      }

      logger.log(`Total processing time: ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        sortedNotifications,
        `Fetched ${sortedNotifications.length} notifications for driver ${driverId}`
      );
    } catch (error: any) {
      logger.error('Error fetching notifications for driver:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching notifications'
      );
    }
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 10
  ): Promise<
    ApiResponse<{
      totalPages: number;
      currentPage: number;
      totalItems: number;
      items: Driver[];
    }>
  > {
    try {
      const skip = (page - 1) * limit;
      const [drivers, total] = await this.driversRepository.findAllPaginated(
        skip,
        limit
      );
      const totalPages = Math.ceil(total / limit);

      return createResponse(
        'OK',
        {
          totalPages,
          currentPage: page,
          totalItems: total,
          items: drivers
        },
        'Fetched paginated drivers'
      );
    } catch (error: any) {
      console.error('Error fetching paginated drivers:', error);
      return createResponse(
        'ServerError',
        null,
        'Error fetching paginated drivers'
      );
    }
  }

  async getNotifications(driverId: string): Promise<ApiResponse<any>> {
    const start = Date.now();
    const cacheKey = `driver:notifications:${driverId}`;
    const cacheTtl = 300; // 5 minutes (notifications change frequently)

    try {
      // Try to get from cache first
      const cacheStart = Date.now();
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(
          `Cache hit for driver notifications ${driverId} in ${Date.now() - cacheStart}ms`
        );
        logger.log(`Total time (cache): ${Date.now() - start}ms`);
        const cachedNotifications = JSON.parse(cachedData);
        return createResponse(
          'OK',
          cachedNotifications,
          `Fetched ${cachedNotifications.length} notifications from cache for driver ${driverId}`
        );
      }

      logger.log(`Cache miss for driver notifications: ${driverId}`);

      // Kiểm tra driver có tồn tại không
      const driverStart = Date.now();
      const driver = await this.driversRepository.findById(driverId);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }
      logger.log(`Driver validation took ${Date.now() - driverStart}ms`);

      // Fetch notifications in parallel for better performance
      const notificationsStart = Date.now();
      const [specificNotifications, broadcastNotifications] = await Promise.all(
        [
          // Lấy thông báo chỉ định riêng cho driver (target_user_id = driverId)
          this.notificationsRepository.findSpecificNotifications(driverId),
          // Lấy thông báo broadcast cho vai trò DRIVER
          this.notificationsRepository.findBroadcastNotifications('DRIVER')
        ]
      );
      logger.log(
        `Notifications fetch took ${Date.now() - notificationsStart}ms`
      );

      logger.log('Fetching broadcast notifications for DRIVER...');
      logger.log(
        `Found ${broadcastNotifications.length} broadcast notifications`
      );

      // Process notifications
      const processingStart = Date.now();
      // Gộp hai danh sách thông báo và loại bỏ trùng lặp
      const allNotifications = [
        ...specificNotifications,
        ...broadcastNotifications
      ];
      const uniqueNotificationsMap = new Map(
        allNotifications.map(n => [n.id, n])
      );
      const uniqueNotifications = Array.from(uniqueNotificationsMap.values());

      // Sắp xếp theo thời gian tạo (mới nhất trước)
      const sortedNotifications = uniqueNotifications.sort(
        (a, b) => b.created_at - a.created_at
      );
      logger.log(
        `Notifications processing took ${Date.now() - processingStart}ms`
      );

      // Cache the result
      const cacheSaveStart = Date.now();
      try {
        await this.redisService.set(
          cacheKey,
          JSON.stringify(sortedNotifications),
          cacheTtl * 1000
        );
        logger.log(
          `Notifications cached successfully (${Date.now() - cacheSaveStart}ms)`
        );
      } catch (cacheError) {
        logger.warn('Failed to cache notifications:', cacheError);
      }

      logger.log(`Total processing time: ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        sortedNotifications,
        `Fetched ${sortedNotifications.length} notifications for driver ${driverId}`
      );
    } catch (error: any) {
      logger.error('Error fetching notifications for restaurant:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching notifications'
      );
    }
  }

  async getDailyAnalytics(
    driverId: string,
    dateStr: string,
    forceRefresh: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      // Validate driver exists
      const driver = await this.driversRepository.findById(driverId);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      // Parse the date string to get start and end timestamps for the day
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'Invalid date format'
        );
      }

      // Set to start of day (00:00:00) in the local timezone (+7)
      const tzOffset = 7 * 3600; // +07:00 timezone offset in seconds
      date.setHours(0, 0, 0, 0);
      const startTimestamp = Math.floor(date.getTime() / 1000) - tzOffset;

      // Set to end of day (23:59:59)
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      const endTimestamp = Math.floor(endDate.getTime() / 1000) - tzOffset;

      // Check Redis cache first
      const cacheKey = `driver:${driverId}:daily_analytics:${dateStr}`;

      // If force_refresh is true, skip cache check
      if (!forceRefresh) {
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
          return createResponse(
            'OK',
            JSON.parse(cachedData),
            'Data retrieved from cache'
          );
        }
      } else {
        // If force_refresh is true, clear the cache for this key
        await redis.del(cacheKey);
      }

      // Get completed orders for the day
      const completedOrders = await this.orderServiceRepository.find({
        where: {
          driver_id: driverId,
          status: OrderStatus.DELIVERED,
          updated_at: Between(startTimestamp, endTimestamp)
        }
      });

      // Get driver progress stages for the day
      const driverProgressStages =
        await this.driverProgressStageServiceRepository.find({
          where: {
            driver_id: driverId,
            updated_at: Between(startTimestamp, endTimestamp)
          },
          relations: ['orders']
        });

      // Calculate analytics
      let totalEarnings = 0;
      let totalTips = 0;
      let totalDistanceTravelled = 0;
      let totalTimeSpent = 0;
      let orderCount = 0;

      // Calculate from orders
      if (completedOrders.length > 0) {
        orderCount = completedOrders.length;
        totalEarnings = completedOrders.reduce(
          (sum, order) => sum + Number(order.driver_wage || 0),
          0
        );
        totalTips = completedOrders.reduce(
          (sum, order) => sum + Number(order.driver_tips || 0),
          0
        );
      }

      // Calculate from driver progress stages
      if (driverProgressStages.length > 0) {
        // Sum up total distance travelled from all stages
        totalDistanceTravelled = driverProgressStages.reduce(
          (sum, stage) => sum + Number(stage.total_distance_travelled || 0),
          0
        );

        // Sum up total time spent from all stages
        totalTimeSpent = driverProgressStages.reduce(
          (sum, stage) => sum + Number(stage.actual_time_spent || 0),
          0
        );
      }

      // Calculate average time spent per order
      const averageTimePerOrder =
        orderCount > 0 ? totalTimeSpent / orderCount : 0;

      // Format the response
      const result = {
        date: dateStr,
        total_earn: this.formatNumber(totalEarnings),
        total_tip: this.formatNumber(totalTips),
        total_distance_travelled: this.formatNumber(totalDistanceTravelled),
        average_time_spent_on_each_order:
          this.formatNumber(averageTimePerOrder),
        order_count: orderCount
      };

      // Cache the result for 1 hour
      await redis.setEx(cacheKey, 3600, JSON.stringify(result));

      return createResponse(
        'OK',
        result,
        forceRefresh
          ? 'Daily analytics refreshed successfully'
          : 'Daily analytics retrieved successfully'
      );
    } catch (error) {
      logger.error('Error retrieving daily analytics:', error);
      return createResponse(
        'ServerError',
        null,
        'Error retrieving daily analytics'
      );
    }
  }

  private formatNumber(value: number): number {
    return Number(value.toFixed(2));
  }
}
