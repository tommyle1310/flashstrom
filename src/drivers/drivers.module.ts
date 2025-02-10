import { Module } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverSchema } from './drivers.schema';
import { UserSchema } from 'src/user/user.schema';
import { DriversGateway } from './drivers.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Driver', schema: DriverSchema }]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  controllers: [DriversController],
  providers: [DriversService, DriversGateway],
})
export class DriversModule {}
