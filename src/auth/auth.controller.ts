import { Controller, Post, Body, Get, Render, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailService } from 'src/mailer/email.service';
import { UsersService } from 'src/users/users.service';
import { createResponse } from 'src/utils/createResponse';
import { Enum_UserType } from 'src/types/Payload';
import { CreateRestaurantSignup } from 'src/restaurants/dto/create-restaurant.dto';
import { IMAGE_LINKS } from 'src/assets/image_urls';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService
  ) {}

  @Post('register-customer')
  async registerCustomer(
    @Body()
    userData: {
      phone: string;
      email: string;
      password: string;
      first_name: string;
      last_name: string;
    }
  ) {
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.CUSTOMER
    );
    console.log('check regis res', registrationResponse);

    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        userData.email
      ); // Send email to the user's email
      await this.usersService.update(registrationResponse.data.data.user_id, {
        verification_code: code
      });

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse;
    }
  }
  @Post('register-driver')
  async registerDriver(
    @Body()
    userData: {
      phone: string;
      email: string;
      password: string;
      first_name: string;
      last_name: string;
    }
  ) {
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.DRIVER
    );

    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        userData.email
      ); // Send email to the user's email
      await this.usersService.update(registrationResponse.data.data.user_id, {
        verification_code: code
      });

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse?.data;
    }
  }

  @Post('register-restaurant')
  async registerRestaurant(
    @Body()
    userData: CreateRestaurantSignup
  ) {
    const fullUserData = {
      ...userData,
      email: userData.contact_email[0].email,
      phone: userData.contact_phone[0].number
    };
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.RESTAURANT_OWNER
    );

    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        fullUserData.email
      ); // Send email to the user's email
      await this.usersService.update(
        registrationResponse.data.data.user_id ??
          registrationResponse.data.data.owner_id,
        { verification_code: code }
      );

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse;
    }
  }

  @Post('register-fwallet')
  async registerFWallet(
    @Body()
    userData: {
      user_id: string;
      email: string;
      password: string;
      balance: string;
    }
  ) {
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.F_WALLET
    );
    console.log('check res', registrationResponse);
    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        userData.email
      ); // Send email to the user's email
      await this.usersService.update(registrationResponse.data.data.user_id, {
        verification_code: code
      });

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse;
    }
  }
  @Post('register-customer-care')
  async registerCustomerCare(
    @Body()
    userData: {
      user_id: string;
      email: string;
      password: string;
      balance: string;
    }
  ) {
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE
    );

    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        userData.email
      ); // Send email to the user's email
      await this.usersService.update(registrationResponse.data.data.user_id, {
        verification_code: code
      });

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse;
    }
  }
  @Post('register-super-admin')
  async registerSuperAdmin(
    @Body()
    userData: {
      user_id: string;
      email: string;
      password: string;
      balance: string;
    }
  ) {
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.SUPER_ADMIN
    );

    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        userData.email
      ); // Send email to the user's email
      await this.usersService.update(registrationResponse.data.data.user_id, {
        verification_code: code
      });

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse;
    }
  }
  @Post('register-finance-admin')
  async registerFinanceAdmin(
    @Body()
    userData: {
      user_id: string;
      email: string;
      password: string;
      balance: string;
    }
  ) {
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.FINANCE_ADMIN
    );

    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        userData.email
      ); // Send email to the user's email
      await this.usersService.update(registrationResponse.data.data.user_id, {
        verification_code: code
      });

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse;
    }
  }
  @Post('register-companion-admin')
  async registerCompanionAdmin(
    @Body()
    userData: {
      user_id: string;
      email: string;
      password: string;
      balance: string;
    }
  ) {
    // Step 1: Register the customer with the provided data
    const registrationResponse = await this.authService.register(
      userData,
      Enum_UserType.COMPANION_ADMIN
    );

    // If registration is successful
    if (registrationResponse?.data?.data) {
      const code = await this.emailService.sendVerificationEmail(
        userData.email
      ); // Send email to the user's email
      await this.usersService.update(registrationResponse.data.data.user_id, {
        verification_code: code
      });

      return createResponse(
        'OK',
        null,
        'Registration successful, verification email sent'
      );
    } else {
      return registrationResponse;
    }
  }

  @Post('login-customer')
  async loginCustomer(
    @Body() credentials: { email: string; password: string }
  ) {
    return this.authService.login(credentials, Enum_UserType.CUSTOMER);
  }
  @Post('login-driver')
  async loginDriver(@Body() credentials: { email: string; password: string }) {
    return this.authService.login(credentials, Enum_UserType.DRIVER);
  }
  @Post('login-fwallet')
  async loginFWallet(@Body() credentials: { email: string; password: string }) {
    return this.authService.login(credentials, Enum_UserType.F_WALLET);
  }

  @Post('login-restaurant')
  async loginRestaurant(
    @Body() credentials: { email: string; password: string }
  ) {
    return this.authService.login(credentials, Enum_UserType.RESTAURANT_OWNER);
  }
  @Post('login-customer-care')
  async loginCustomerCare(
    @Body() credentials: { email: string; password: string }
  ) {
    console.log('fall here contorller', {
      credentials
    });
    return this.authService.login(
      credentials,
      Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE
    );
  }
  @Post('login-companion-admin')
  async loginCompanionAdmin(
    @Body() credentials: { email: string; password: string }
  ) {
    console.log('fall here contorller', {
      credentials
    });
    return this.authService.login(credentials, Enum_UserType.COMPANION_ADMIN);
  }
  @Post('login-finance-admin')
  async loginFinanceAdmin(
    @Body() credentials: { email: string; password: string }
  ) {
    console.log('fall here contorller', {
      credentials
    });
    return this.authService.login(credentials, Enum_UserType.FINANCE_ADMIN);
  }
  @Post('login-super-admin')
  async loginSuperAdmin(
    @Body() credentials: { email: string; password: string }
  ) {
    console.log('fall here contorller', {
      credentials
    });
    return this.authService.login(credentials, Enum_UserType.SUPER_ADMIN);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() { email, code }: { email: string; code: string } // Accept email and verification code
  ) {
    try {
      if (!email || !code) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'You must provide a valid email and a verification code'
        );
      }
      const result = await this.emailService.verifyEmail(email, code); // Verify email with the code
      return result;
    } catch (error) {
      console.error('Error during email verification:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred during verification, please try again.'
      );
    }
  }

  @Post('request-reset-password')
  async requestResetPassword(@Body() { email }: { email: string }) {
    try {
      if (!email) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'You must provide a valid email'
        );
      }

      const result = await this.authService.requestPasswordReset(email);
      return result;
    } catch (error) {
      console.error('Error during password reset request:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred during password reset request, please try again.'
      );
    }
  }

  // New endpoint to reset the password using the token
  @Post('reset-password')
  async resetPassword(
    @Body() { token, newPassword }: { token: string; newPassword: string }
  ) {
    try {
      if (!token || !newPassword) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'You must provide a valid token and new password'
        );
      }

      const result = await this.authService.resetPassword(token, newPassword);
      return result;
    } catch (error) {
      console.error('Error during password reset:', error);
      return createResponse(
        'ServerError',
        null,
        'An error occurred during password reset, please try again.'
      );
    }
  }

  @Get('reset-password')
  @Render('reset-password')
  async renderResetPasswordPage(@Query('token') token: string) {
    if (!token) {
      return {
        token: '',
        error:
          'Invalid or missing token. Please request a new password reset link.',
        logoFlashfood: IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO // Replace with your actual logo URL or use IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO
      };
    }

    return {
      token,
      logoFlashfood: IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO // Replace with your actual logo URL or use IMAGE_LINKS.LIGHT_FLASHFOOD_LOGO
    };
  }
}
