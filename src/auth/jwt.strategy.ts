import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt'; // Ensure JwtService is imported
import { UserService } from 'src/user/user.service'; // If you need UserService for user validation
import * as dotenv from 'dotenv';
dotenv.config();


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly jwtService: JwtService,  // JwtService injected here
    private readonly userService: UserService, // If you need user validation
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET, // Ensure JWT_SECRET is passed here
    });
  }

  async validate(payload: any) {
    // You can add user validation logic if needed
    const user = await this.userService.getUserById(payload.userId); // Example of user validation
    return user;
  }
}
