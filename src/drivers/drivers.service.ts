import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './drivers.schema'; // Assuming a Driver schema similar to Customer
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { ApiResponse } from 'src/utils/createResponse';
import { Type_Delivery_Order } from 'src/types/Driver';
import { AddressBookService } from 'src/address_book/address_book.service';

@Injectable()
export class DriversService {
  constructor(
    private readonly addressBookService: AddressBookService,
    @InjectModel('Driver') private readonly driverModel: Model<Driver>
  ) {}

  // Create a new driver
  async create(createDriverDto: CreateDriverDto): Promise<ApiResponse<Driver>> {
    try {
      const existingDriver = await this.findDriverByUserId(
        createDriverDto.user_id
      );
      if (existingDriver) {
        return this.handleDuplicateDriver();
      }

      const newDriver = await this.saveNewDriver(createDriverDto);
      return createResponse('OK', newDriver, 'Driver created successfully');
    } catch (error) {
      return this.handleError('Error creating driver:', error);
    }
  }

  // Get all drivers
  async findAll(): Promise<ApiResponse<Driver[]>> {
    try {
      const drivers = await this.driverModel.find().exec();
      return createResponse('OK', drivers, 'Fetched all drivers');
    } catch (error) {
      return this.handleError('Error fetching drivers:', error);
    }
  }

  // Get a driver by ID
  async findDriverById(id: string): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driverModel.findById(id).exec();
      return this.handleDriverResponse(driver);
    } catch (error) {
      return this.handleError('Error fetching driver:', error);
    }
  }

  async findOne(conditions: object): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driverModel.findOne(conditions).exec();
      return this.handleDriverResponse(driver);
    } catch (error) {
      return this.handleError('Error fetching driver:', error);
    }
  }

  // Update a driver by ID
  async update(
    id: string,
    updateDriverDto: UpdateDriverDto
  ): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driverModel.findById(id).exec();
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      const updatedDriver = await this.updateDriverDetails(
        driver,
        updateDriverDto
      );
      return createResponse('OK', updatedDriver, 'Driver updated successfully');
    } catch (error) {
      return this.handleError('Error updating driver:', error);
    }
  }

  async setAvailability(id: string): Promise<ApiResponse<Driver>> {
    try {
      const driver = await this.driverModel.findById(id).exec();
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      driver.available_for_work = !driver.available_for_work;
      const savedDriver = await driver.save();
      return createResponse(
        'OK',
        savedDriver,
        'Driver availability updated successfully'
      );
    } catch (error) {
      return this.handleError('Error updating driver availability:', error);
    }
  }

  // Delete a driver by ID
  async remove(id: string): Promise<ApiResponse<null>> {
    try {
      const deletedDriver = await this.driverModel.findByIdAndDelete(id).exec();
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
      const driver = await this.driverModel.findByIdAndUpdate(
        entityId,
        { avatar: { url: uploadResult.url, key: uploadResult.public_id } },
        { new: true }
      );
      return this.handleDriverResponse(driver);
    } catch (error) {
      return this.handleError('Error updating driver avatar:', error);
    }
  }

  // prioritize drivers when app finding driver
  async prioritizeAndAssignDriver(
    listAvailableDrivers: Array<{
      _id: string;
      location: { lng: number; lat: number };
      active_points?: number;
      current_order_id?: string[];
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

      // Temporarily disabled prioritization logic
      // const prioritizedDrivers = this.calculateDriverPriorities(
      //   listAvailableDrivers,
      //   restaurantLocation
      // );

      // Hard-coded to return specific driver only
      const specificDriver = listAvailableDrivers.find(
        driver => driver._id === 'DRI_1bcb34fa-ac9d-4611-b432-4e05586e137c'
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
      const driver = await this.driverModel.findById(driverId).exec();
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      // Add order to driver's current orders (max 3)
      if (driver.current_order_id.length >= 3) {
        return createResponse(
          'DRIVER_MAXIMUM_ORDER',
          null,
          'Driver already has maximum orders'
        );
      }

      // Calculate active points based on distance
      const points = this.calculateActivePoints(
        driver.current_location?.lat || 10.826411,
        driver.current_location?.lng || 106.617353,
        restaurantLocation.lat || 0,
        restaurantLocation.lng || 0
      );

      // Update driver
      const updatedDriver = await this.driverModel
        .findByIdAndUpdate(
          driverId,
          {
            $push: { current_order_id: orderId },
            $inc: { active_points: points },
            is_on_delivery: true
          },
          { new: true }
        )
        .exec();

      return createResponse('OK', updatedDriver, 'Driver updated successfully');
    } catch (error) {
      return this.handleError('Error updating driver:', error);
    }
  }

  private calculateActivePoints(
    driverLat: number,
    driverLng: number,
    restaurantLat: number,
    restaurantLng: number
  ): number {
    const distance = this.calculateDistance(
      driverLat,
      driverLng,
      restaurantLat,
      restaurantLng
    );

    if (distance <= 2) return 3;
    if (distance <= 5) return 6;
    return 10;
  }

  // Private helper methods
  private async findDriverByUserId(userId: string): Promise<Driver | null> {
    return this.driverModel.findOne({ user_id: userId }).exec();
  }

  private async saveNewDriver(driverData: CreateDriverDto): Promise<Driver> {
    const newDriver = new this.driverModel(driverData);
    return newDriver.save();
  }

  private handleDuplicateDriver(): ApiResponse<null> {
    return createResponse(
      'DuplicatedRecord',
      null,
      'Driver with this user ID already exists'
    );
  }

  private handleDriverResponse(driver: Driver | null): ApiResponse<Driver> {
    if (!driver) {
      return createResponse('NotFound', null, 'Driver not found');
    }
    return createResponse('OK', driver, 'Driver retrieved successfully');
  }

  private async updateDriverDetails(
    driver: Driver,
    updateData: UpdateDriverDto
  ): Promise<Driver> {
    const { contact_phone, contact_email, first_name, last_name } = updateData;

    if (contact_phone?.length) {
      this.updateContactDetails(driver.contact_phone, contact_phone, 'number');
    }

    if (contact_email?.length) {
      this.updateContactDetails(driver.contact_email, contact_email, 'email');
    }

    return this.driverModel
      .findByIdAndUpdate(
        driver._id,
        {
          contact_phone: driver.contact_phone,
          contact_email: driver.contact_email,
          first_name,
          last_name
        },
        { new: true }
      )
      .exec();
  }

  private updateContactDetails(
    existing: any[],
    newData: any[],
    key: string
  ): void {
    for (const newItem of newData) {
      const existingIndex = existing.findIndex(
        item => item[key] === newItem[key]
      );
      if (existingIndex !== -1) {
        existing[existingIndex] = newItem;
      } else {
        existing.push(newItem);
      }
    }
  }

  private async getRestaurantLocation(locationId: string): Promise<any> {
    const response =
      await this.addressBookService.getAddressBookById(locationId);
    return response.EC === 0 ? response.data.location : null;
  }

  private calculateDriverPriorities(
    drivers: any[],
    restaurantLocation: any
  ): any[] {
    return drivers
      .map(driver => ({
        ...driver,
        distance: this.calculateDistance(
          driver.location.lat,
          driver.location.lng,
          restaurantLocation.lat,
          restaurantLocation.lng
        ),
        active_points: driver.active_points || 0,
        current_order_id: driver.current_order_id || []
      }))
      .sort((a, b) => this.compareDriverPriorities(a, b));
  }

  private compareDriverPriorities(a: any, b: any): number {
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.active_points !== b.active_points)
      return b.active_points - a.active_points;
    return (
      (a.current_order_id?.length || 0) - (b.current_order_id?.length || 0)
    );
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
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
