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
import { Order } from 'src/orders/entities/order.entity';
import { OrdersRepository } from 'src/orders/orders.repository';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
import { In } from 'typeorm';
import { MenuItem } from 'src/menu_items/entities/menu_item.entity';
import { DRIVER_MOCK } from 'src/utils/constants';

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
    private readonly driverStatsService: DriverStatsService,
    private readonly addressRepository: AddressBookRepository,
    private readonly driverProgressStageRepository: DriverProgressStagesRepository,
    private readonly onlineSessionsService: OnlineSessionsService,
    private readonly dataSource: DataSource,
    private readonly ratingsReviewsRepository: RatingsReviewsRepository,
    private readonly redisService: RedisService
  ) {}

  async onModuleInit() {
    await this.preloadDrivers();
  }

  async preloadDrivers() {
    try {
      const start = Date.now();
      const drivers = await this.driverEntityRepository.find({
        select: ['id', 'available_for_work'],
        take: 5000 // Giảm để tránh vượt quota Upstash
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
    const cacheKey = `orders:driver:${driverId}`;
    const ttl = 300; // Cache 5 minutes (300 seconds)
    const start = Date.now();

    try {
      // Check cache first
      const cacheStart = Date.now();
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        logger.log(`Fetched orders from cache in ${Date.now() - cacheStart}ms`);
        logger.log(`Total time (cache): ${Date.now() - start}ms`);
        return createResponse(
          'OK',
          JSON.parse(cachedData),
          'Fetched orders from cache successfully'
        );
      }
      logger.log(`Cache miss for ${cacheKey}`);

      // Check driver exists
      const driverStart = Date.now();
      const driver = await this.driversRepository.findById(driverId);
      if (!driver) {
        logger.log(`Driver fetch took ${Date.now() - driverStart}ms`);
        return createResponse('NotFound', null, 'Driver not found');
      }
      logger.log(`Driver fetch took ${Date.now() - driverStart}ms`);

      // Get orders with optimized fields
      const ordersStart = Date.now();
      const orders = await this.dataSource.getRepository(Order).find({
        where: { driver_id: driverId },
        relations: [
          'restaurant',
          'customer',
          'restaurantAddress',
          'customerAddress'
        ],
        select: {
          id: true,
          customer_id: true,
          restaurant_id: true,
          driver_id: true,
          status: true,
          total_amount: true,
          payment_status: true,
          payment_method: true,
          customer_location: true,
          restaurant_location: true,
          order_items: true,
          customer_note: true,
          restaurant_note: true,
          distance: true,
          delivery_fee: true,
          updated_at: true,
          order_time: true,
          delivery_time: true,
          tracking_info: true,
          cancelled_by: true,
          cancelled_by_id: true,
          cancellation_reason: true,
          cancellation_title: true,
          cancellation_description: true,
          cancelled_at: true,
          restaurant: {
            id: true,
            restaurant_name: true,
            address_id: true,
            avatar: { url: true, key: true }
          }
        }
      });
      logger.log(`Orders fetch took ${Date.now() - ordersStart}ms`);

      if (!orders || orders.length === 0) {
        const response = createResponse(
          'OK',
          [],
          'No orders found for this driver'
        );
        await this.redisService.setNx(cacheKey, JSON.stringify([]), ttl * 1000);
        logger.log(`Stored empty orders in cache: ${cacheKey}`);
        return response;
      }

      // Get specializations
      const specializationsStart = Date.now();
      const restaurantIds = orders.map(order => order.restaurant_id);
      const specializations = await this.dataSource
        .createQueryBuilder()
        .select('rs.restaurant_id', 'restaurant_id')
        .addSelect('array_agg(fc.name)', 'specializations')
        .from('restaurant_specializations', 'rs')
        .leftJoin('food_categories', 'fc', 'fc.id = rs.food_category_id')
        .where('rs.restaurant_id IN (:...restaurantIds)', { restaurantIds })
        .groupBy('rs.restaurant_id')
        .getRawMany();
      const specializationMap = new Map(
        specializations.map(spec => [spec.restaurant_id, spec.specializations])
      );
      logger.log(
        `Specializations fetch took ${Date.now() - specializationsStart}ms`
      );

      // Batch query MenuItem
      const menuItemsStart = Date.now();
      const allItemIds = orders.flatMap(order =>
        order.order_items.map(item => item.item_id)
      );
      const menuItems = await this.dataSource.getRepository(MenuItem).find({
        where: { id: In(allItemIds) },
        select: {
          id: true,
          name: true,
          price: true,
          avatar: { url: true, key: true },
          restaurant: {
            id: true,
            restaurant_name: true,
            address_id: true,
            avatar: { url: true, key: true }
          }
        },
        relations: ['restaurant']
      });
      const menuItemMap = new Map(menuItems.map(item => [item.id, item]));
      logger.log(`MenuItems fetch took ${Date.now() - menuItemsStart}ms`);

      // Populate orders
      const processingStart = Date.now();
      const populatedOrders = orders.map(order => {
        const populatedOrderItems = order.order_items.map(item => ({
          ...item,
          menu_item: menuItemMap.get(item.item_id) || null
        }));

        const restaurantSpecializations =
          specializationMap.get(order.restaurant_id) || [];

        const baseOrder = {
          ...order,
          order_items: populatedOrderItems,
          customer_address: order.customerAddress,
          restaurant_address: order.restaurantAddress,
          restaurant: {
            ...order.restaurant,
            specialize_in: restaurantSpecializations
          }
        };

        if (
          order.status === 'CANCELLED' ||
          order.tracking_info === 'CANCELLED'
        ) {
          return {
            ...baseOrder,
            cancelled_by: order.cancelled_by,
            cancelled_by_id: order.cancelled_by_id,
            cancellation_reason: order.cancellation_reason,
            cancellation_title: order.cancellation_title,
            cancellation_description: order.cancellation_description,
            cancelled_at: order.cancelled_at
          };
        }

        return baseOrder;
      });
      logger.log(`Orders processing took ${Date.now() - processingStart}ms`);

      // Store in cache
      const cacheSaveStart = Date.now();
      const cacheSaved = await this.redisService.setNx(
        cacheKey,
        JSON.stringify(populatedOrders),
        ttl * 1000
      );
      if (cacheSaved) {
        logger.log(
          `Stored orders in cache: ${cacheKey} (took ${Date.now() - cacheSaveStart}ms)`
        );
      } else {
        logger.warn(`Failed to store orders in cache: ${cacheKey}`);
      }

      logger.log(`Total DB fetch and processing took ${Date.now() - start}ms`);
      return createResponse(
        'OK',
        populatedOrders,
        'Fetched orders successfully'
      );
    } catch (error: any) {
      logger.error(`Error fetching orders: ${error.message}`, error.stack);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching orders'
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
}
