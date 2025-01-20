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
import { EmailService } from 'src/mailer/email.service';
import { MailerCustomModule } from 'src/mailer/mailer.module';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // Your JWT secret
      signOptions: { expiresIn: '1h' }, // Token expiration time
    }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]), // Make sure the User model is available
    UserModule, // Import UserModule to make the UserService available
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]), // Customer model
    CustomersModule, // Import CustomersModule
    MailerCustomModule,  // Import Mailer module to handle emails
  ],
  providers: [AuthService, JwtStrategy, EmailService, UserService], // Make sure EmailService is included here
  controllers: [AuthController], // Only controllers should be listed here
  exports: [AuthService, EmailService], // Export AuthService and EmailService if needed in other modules
})
export class AuthModule {}
