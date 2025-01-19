import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

@Post('register-customer')
async registerCustomer(@Body() userData: {phone: string, email: string, password: string, first_name: string, last_name: string}) {
  console.log('Received user data:', userData); // Check the received data
  return this.authService.registerCustomer(userData);
}


  @Post('login')
  async login(@Body() credentials: { phone: string; password: string }) {
    return this.authService.login(credentials);
  }
}
