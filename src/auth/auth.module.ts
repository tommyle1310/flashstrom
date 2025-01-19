// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';  // Import UserModule to make the UserModel available
import { JwtStrategy } from './jwt.strategy'; // Your JwtStrategy
import { AuthService } from './auth.service'; // Your AuthService
import { UserSchema } from 'src/user/user.schema';
import { CustomersModule } from 'src/customers/customers.module';
import { CustomerSchema } from 'src/customers/customer.schema';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // Your JWT secret
      signOptions: { expiresIn: '1h' }, // Token expiration time
    }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Make sure the User model is available
    UserModule, // Import UserModule to make the UserService available,
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]), // Make sure the User model is available
    CustomersModule, // Import UserModule to make the UserService available,
  ],
  providers: [AuthService, JwtStrategy], // AuthService and JwtStrategy are provided
  controllers: [AuthController],
  exports: [AuthService], // If needed, export AuthService
})
export class AuthModule {}
