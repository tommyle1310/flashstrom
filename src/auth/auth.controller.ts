import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailService } from 'src/mailer/email.service';
import { UserService } from 'src/user/user.service';
import { createResponse } from 'src/utils/createResponse';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
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
    },
  ) {
      // Step 1: Register the customer with the provided data
      const registrationResponse =
        await this.authService.registerCustomer(userData);

      // If registration is successful
      if (registrationResponse?.data?.data) {
        const code = await this.emailService.sendVerificationEmail(
          userData.email,
        ); // Send email to the user's email
        await this.userService.updateUser(
          registrationResponse.data.data.user_id,
          { verification_code: code },
        );

        return { message: 'Registration successful, verification email sent!' };
      } else {
        return { message: 'Registration failed, please try again.' };
      }
  }

  @Post('login')
  async login(@Body() credentials: { email: string; password: string }) {
    return this.authService.login(credentials);
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() { email, code }: { email: string; code: string }, // Accept email and verification code
  ) {
    try {
      if (!email || !code) {
        return createResponse(
          'InvalidFormatInput',
          null,
          'You must provide a valid email and a verification code',
        );
      }
      const result = await this.emailService.verifyEmail(email, code); // Verify email with the code
      return result;
    } catch (error) {
      console.error('Error during email verification:', error);
      return {
        message: 'An error occurred during verification, please try again.',
      };
    }
  }
}
