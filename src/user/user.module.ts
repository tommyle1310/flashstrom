// user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserSchema } from './user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Register User model with Mongoose
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export UserService to be used in other modules like AuthModule
})
export class UserModule {}
