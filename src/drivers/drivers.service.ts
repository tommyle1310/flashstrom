import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './drivers.schema'; // Assuming a Driver schema similar to Customer
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses
import { Type_Delivery_Order } from 'src/types/Driver';
import { AddressBookService } from 'src/address_book/address_book.service';

@Injectable()
export class DriversService {
  constructor(
    private readonly addressBookService: AddressBookService,
    @InjectModel('Driver') private readonly driverModel: Model<Driver>,
  ) {}

  // Create a new driver
  async create(createDriverDto: CreateDriverDto): Promise<any> {
    const {
      user_id,
      first_name,
      last_name,
      contact_email,
      contact_phone,
      vehicle,
      current_location,
      current_order_id,
      created_at,
      updated_at,
      avatar,
      available_for_work,
      is_on_delivery,
      rating,
      last_login,
    } = createDriverDto;

    try {
      // Check if the driver already exists by user ID
      const existingDriver = await this.driverModel.findOne({ user_id }).exec();
      if (existingDriver) {
        return createResponse(
          'DuplicatedRecord',
          null,
          'Driver with this user ID already exists',
        );
      }

      // Create new driver
      const newDriver = new this.driverModel({
        user_id,
        first_name,
        last_name,
        contact_email,
        contact_phone,
        vehicle,
        current_location,
        current_order_id,
        created_at,
        updated_at,
        avatar,
        available_for_work,
        is_on_delivery,
        rating,
        last_login,
      });

      // Save the new driver and return success response
      await newDriver.save();
      return createResponse('OK', newDriver, 'Driver created successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while creating the driver',
      );
    }
  }

  // Get all drivers
  async findAll(): Promise<any> {
    try {
      const drivers = await this.driverModel.find().exec();
      return createResponse('OK', drivers, 'Fetched all drivers');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching drivers',
      );
    }
  }

  // Get a driver by ID
  async findDriverById(id: string): Promise<any> {
    try {
      const driver = await this.driverModel.findById(id).exec();
      if (!driver) {
        return createResponse('NotFound', null, 'Driver not found');
      }
      return createResponse('OK', driver, 'Fetched driver successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the driver',
      );
    }
  }

  async findOne(conditions: object): Promise<any> {
    const driver = await this.driverModel.findOne(conditions).exec();
    if (!driver) {
      return createResponse('NotFound', null, 'Driver not found');
    }
    try {
      return createResponse('OK', driver, 'Fetched driver successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while fetching the driver',
      );
    }
  }

  // Update a driver by ID
  async update(id: string, updateDriverDto: UpdateDriverDto): Promise<any> {
    const { contact_phone, contact_email, first_name, last_name } =
      updateDriverDto;

    // Retrieve the current driver data before making changes
    const updatedDriver = await this.driverModel.findById(id).exec();

    if (!updatedDriver) {
      return createResponse('NotFound', null, 'Driver not found');
    }

    // Check and handle contact_phone numbers
    if (contact_phone && contact_phone.length > 0) {
      for (const newPhone of contact_phone) {
        // Check if the phone number already exists in the driver's contact_phone
        const existingPhoneIndex = updatedDriver.contact_phone.findIndex(
          (phone) => phone.number === newPhone.number,
        );

        if (existingPhoneIndex !== -1) {
          // If phone number exists, update it
          updatedDriver.contact_phone[existingPhoneIndex] = newPhone;
        } else {
          // If phone number doesn't exist, push it to the contact_phone array
          updatedDriver.contact_phone.push(newPhone);
        }
      }
    }

    // Check and handle contact_email emails
    if (contact_email && contact_email.length > 0) {
      for (const newEmail of contact_email) {
        // Check if the email already exists in the driver's contact_email
        const existingEmailIndex = updatedDriver.contact_email.findIndex(
          (email) => email.email === newEmail.email,
        );

        if (existingEmailIndex !== -1) {
          // If email exists, update it
          updatedDriver.contact_email[existingEmailIndex] = newEmail;
        } else {
          // If email doesn't exist, push it to the contact_email array
          updatedDriver.contact_email.push(newEmail);
        }
      }
    }

    // Update the driver with the modified contact details
    const finalUpdatedDriver = await this.driverModel
      .findByIdAndUpdate(
        id,
        {
          contact_phone: updatedDriver.contact_phone,
          contact_email: updatedDriver.contact_email,
          first_name,
          last_name,
        },
        { new: true },
      )
      .exec();

    return createResponse(
      'OK',
      finalUpdatedDriver,
      'Driver updated successfully',
    );
  }

  async setAvailability(id: string): Promise<any> {
    try {
      // Find the driver by ID
      const updatedDriver = await this.driverModel.findById(id).exec();

      if (!updatedDriver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      // Toggle the available_for_work field (flip its boolean value)
      updatedDriver.available_for_work = !updatedDriver.available_for_work;

      // Save the updated driver
      const savedDriver = await updatedDriver.save();

      return createResponse('OK', savedDriver, 'Driver updated successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while updating the driver',
      );
    }
  }

  // Delete a driver by ID
  async remove(id: string): Promise<any> {
    try {
      const deletedDriver = await this.driverModel.findByIdAndDelete(id).exec();

      if (!deletedDriver) {
        return createResponse('NotFound', null, 'Driver not found');
      }

      return createResponse('OK', null, 'Driver deleted successfully');
    } catch (error) {
      return createResponse(
        'ServerError',
        null,
        'An error occurred while deleting the driver',
      );
    }
  }

  async updateEntityAvatar(
    uploadResult: { url: string; public_id: string },
    entityId: string,
  ) {
    const driver = await this.driverModel.findByIdAndUpdate(
      entityId,
      { avatar: { url: uploadResult.url, key: uploadResult.public_id } },
      { new: true },
    );

    if (!driver) {
      return createResponse('NotFound', null, 'Driver not found');
    }

    return createResponse('OK', driver, 'Driver avatar updated successfully');
  }

  // prioritize drivers when app finding driver
  async prioritizeAndAssignDriver(
    listAvailableDrivers: {
      _id: string;
      location: { lng: number; lat: number };
      active_points?: number;
      current_order_id?: string[];
    }[],
    orderDetails: Type_Delivery_Order,
  ): Promise<any> {
    const { restaurant_location } = orderDetails;
    if (!restaurant_location) {
      return createResponse('NotFound', null, 'Restaurant location not found');
    }

    let restaurantLocation;
    const restaurantAddressBookResponse =
      await this.addressBookService.getAddressBookById(restaurant_location);
    const { data, EC, EM } = restaurantAddressBookResponse;

    if (EC === 0) {
      restaurantLocation = data.location;

      // Calculate distance for each driver
      const driversWithDistance = listAvailableDrivers.map((driver) => {
        // Get driver's location
        const driverLocation = driver.location;

        // Calculate distance between driver and restaurant
        const distance = this.calculateDistance(
          driverLocation.lat,
          driverLocation.lng,
          restaurantLocation.lat,
          restaurantLocation.lng,
        );

        // Return driver with distance
        return {
          ...driver,
          distance,
          active_points: driver.active_points || 0,
          current_order_id: driver.current_order_id || [],
        };
      });

      // Sort drivers: 1. By distance, 2. By active_points, 3. By number of current orders
      const sortedDrivers = driversWithDistance.sort((a, b) => {
        // First, prioritize by distance
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }

        // If distances are equal, prioritize by active_points (higher is better)
        if (a.active_points !== b.active_points) {
          return b.active_points - a.active_points;
        }

        // If active_points are equal, prioritize by number of current orders (fewer is better)
        return (
          (a.current_order_id?.length || 0) - (b.current_order_id?.length || 0)
        );
      });
      // console.log('check kkkkkkk ', sortedDrivers);

      // Return the sorted array of drivers
      return createResponse(
        'OK',
        sortedDrivers,
        'Drivers prioritized successfully',
      );
    }

    return createResponse(
      'Forbidden',
      null,
      'Failed to get restaurant location',
    );
  }

  // Helper function to calculate distance between two points using Haversine formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
