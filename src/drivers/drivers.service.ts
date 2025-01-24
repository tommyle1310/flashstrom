import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './drivers.schema'; // Assuming a Driver schema similar to Customer
import { createResponse } from 'src/utils/createResponse'; // Utility for creating responses

@Injectable()
export class DriversService {
  constructor(
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
    const { contact_phone, contact_email } = updateDriverDto;

    // Retrieve the current driver data before making changes
    const updatedDriver = await this.driverModel.findById(id).exec();

    if (!updatedDriver) {
      return createResponse('NotFound', null, 'Driver not found');
    }

    // Check and handle contact_phone numbers
    if (contact_phone && contact_phone.length > 0) {
      for (const newPhone of contact_phone) {
        // Check if the phone number already exists in the driver's contact_phone
        const existingPhone = updatedDriver.contact_phone.find(
          (phone) => phone.number === newPhone.number,
        );

        if (!existingPhone) {
          // If phone number doesn't exist, push it to the contact_phone array
          updatedDriver.contact_phone.push(newPhone);
        }
      }
    }

    // Check and handle contact_email emails
    if (contact_email && contact_email.length > 0) {
      for (const newEmail of contact_email) {
        // Check if the email already exists in the driver's contact_email
        const existingEmail = updatedDriver.contact_email.find(
          (email) => email.email === newEmail.email,
        );

        if (!existingEmail) {
          // If email doesn't exist, push it to the contact_email array
          updatedDriver.contact_email.push(newEmail);
        }
      }
    }

    // Update the driver with the modified contact details
    const finalUpdatedDriver = await this.driverModel
      .findByIdAndUpdate(id, updatedDriver, { new: true })
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
}
