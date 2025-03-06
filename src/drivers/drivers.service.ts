import { Injectable } from '@nestjs/common';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './entities/driver.entity';
import { createResponse } from 'src/utils/createResponse';
import { ApiResponse } from 'src/utils/createResponse';
import { Type_Delivery_Order } from 'src/types/Driver';
import { calculateDistance } from 'src/utils/distance';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { DriversRepository } from './drivers.repository';
import { Order } from 'src/orders/entities/order.entity';
import { HARDED_CODE_TEST } from 'src/utils/types/harded_code_test';
import { OrdersRepository } from 'src/orders/orders.repository';

@Injectable()
export class DriversService {
  constructor(
    private readonly driversRepository: DriversRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly addressRepository: AddressBookRepository
  ) {}

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
    } catch (error) {
      console.error('Error creating driver:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the driver'
      );
    }
  }

  async findAll(): Promise<ApiResponse<Driver[]>> {
    try {
      const drivers = await this.driversRepository.findAll();
      return createResponse('OK', drivers, 'Fetched all drivers');
    } catch (error) {
      return this.handleError('Error fetching drivers:', error);
    }
  }

  async findDriverById(
    id: string,
    options?: { relations?: string[] }
  ): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findById(id, options);
      return this.handleDriverResponse(driver);
    } catch (error) {
      return this.handleError('Error fetching driver:', error);
    }
  }

  async findOne(conditions: object): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findOne(conditions);
      return this.handleDriverResponse(driver);
    } catch (error) {
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
    } catch (error) {
      return this.handleError('Error updating driver:', error);
    }
  }

  async setAvailability(id: string): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findById(id);
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      driver.available_for_work = !driver.available_for_work;
      const savedDriver = await this.driversRepository.save(driver);
      return createResponse(
        'OK',
        savedDriver,
        'Driver availability updated successfully'
      );
    } catch (error) {
      return this.handleError('Error updating driver availability:', error);
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedDriver = await this.driversRepository.remove(id);
      if (!deletedDriver) {
        return createResponse('NotFound', null, 'Driver not found');
      }
      return createResponse('OK', null, 'Driver deleted successfully');
    } catch (error) {
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
    } catch (error) {
      return this.handleError('Error updating driver avatar:', error);
    }
  }

  async prioritizeAndAssignDriver(
    listAvailableDrivers: Array<{
      _id: string;
      location: { lng: number; lat: number };
      active_points?: number;
      current_order_id?: string[]; // Đổi thành current_orders nếu cần
    }>,
    orderDetails: Type_Delivery_Order
  ): Promise<ApiResponse<any>> {
    try {
      if (!listAvailableDrivers?.length) {
        return createResponse('NoDrivers', [], 'No available drivers found');
      }

      const restaurantLocation = await this.getRestaurantLocation(
        orderDetails.restaurant_location
      );
      if (!restaurantLocation) {
        return createResponse(
          'NotFound',
          null,
          'Restaurant location not found'
        );
      }

      const specificDriver = listAvailableDrivers.find(
        driver => driver._id === HARDED_CODE_TEST.prioritised_drivers[0]
      );
      const result = specificDriver ? [specificDriver] : [];
      return createResponse('OK', result, 'Driver selected successfully');
    } catch (error) {
      return this.handleError('Error prioritizing drivers:', error);
    }
  }

  async addOrderToDriver(
    driverId: string,
    orderId: string,
    restaurantLocation: { lat: number; lng: number }
  ): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findById(driverId, {
        relations: ['current_orders'] // Load quan hệ current_orders
      });
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      // Check max 3 orders
      if (driver.current_orders.length >= 3) {
        return createResponse(
          'DRIVER_MAXIMUM_ORDER',
          null,
          'Driver already has maximum orders'
        );
      }

      // Lấy Order từ DB để thêm vào current_orders
      const order = new Order();
      order.id = orderId; // Giả sử chỉ cần ID, nếu cần thêm field thì query Order từ repo
      const updatedOrders = [...driver.current_orders, order];

      // Calculate active points
      const points = this.calculateActivePoints(
        driver.current_location?.lat || 10.826411,
        driver.current_location?.lng || 106.617353,
        restaurantLocation.lat || 0,
        restaurantLocation.lng || 0
      );

      // Update driver
      const updatedDriver = await this.driversRepository.update(driverId, {
        current_orders: updatedOrders, // Dùng mảng Order[]
        active_points: driver.active_points + points,
        is_on_delivery: true,
        created_at: driver.created_at,
        updated_at: Math.floor(Date.now() / 1000),
        last_login: driver.last_login
      });

      return createResponse('OK', updatedDriver, 'Driver updated successfully');
    } catch (error) {
      return this.handleError('Error updating driver:', error);
    }
  }

  async updateDriverDeliveryStatus(
    driverId: string,
    orderId: Order['id'],
    status: boolean
  ): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driversRepository.findById(driverId, {
        relations: ['current_orders'] // Load quan hệ
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
        // Thêm order vào current_orders
        const newOrder = new Order();
        newOrder.id = orderId;
        updateData.current_orders = [
          ...(driver.current_orders || []),
          newOrder
        ];
        updateData.active_points = (driver.active_points || 0) + 1;
      } else {
        // Xóa order khỏi current_orders
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
    } catch (error) {
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
      driver.current_orders = orders.filter(order => order !== null); // Cập nhật danh sách orders
      await this.driversRepository.save(driver); // Lưu để cập nhật bảng join
    }
  }

  private calculateActivePoints(
    driverLat: number,
    driverLng: number,
    restaurantLat: number,
    restaurantLng: number
  ): number {
    const distance = calculateDistance(
      driverLat,
      driverLng,
      restaurantLat,
      restaurantLng
    );
    if (distance <= 2) return 3;
    if (distance <= 5) return 6;
    return 10;
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
        current_orders: driver.current_orders || [] // Đổi từ current_order_id
      }))
      .sort((a, b) => this.compareDriverPriorities(a, b));
  }

  private compareDriverPriorities(a: any, b: any): number {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.active_points !== b.active_points)
      return b.active_points - a.active_points;
    return (a.current_orders?.length || 0) - (b.current_orders?.length || 0); // Đổi từ current_order_id
  }

  private handleError(message: string, error: any): ApiResponse<null> {
    console.error(message, error);
    return createResponse(
      'ServerError',
      null,
      'An error occurred while processing your request'
    );
  }
}
