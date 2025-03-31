import { AuthService } from './auth.service';
import { EmailService } from 'src/mailer/email.service';
import { UsersService } from 'src/users/users.service';
import { CreateRestaurantSignup } from 'src/restaurants/dto/create-restaurant.dto';
export declare class AuthController {
    private readonly authService;
    private readonly emailService;
    private readonly usersService;
    constructor(authService: AuthService, emailService: EmailService, usersService: UsersService);
    registerCustomer(userData: {
        phone: string;
        email: string;
        password: string;
        first_name: string;
        last_name: string;
    }): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    registerDriver(userData: {
        phone: string;
        email: string;
        password: string;
        first_name: string;
        last_name: string;
    }): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    registerRestaurant(userData: CreateRestaurantSignup): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    registerFWallet(userData: {
        user_id: string;
        email: string;
        password: string;
        balance: string;
    }): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    registerCustomerCare(userData: {
        user_id: string;
        email: string;
        password: string;
        balance: string;
    }): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    loginCustomer(credentials: {
        email: string;
        password: string;
    }): Promise<any>;
    loginDriver(credentials: {
        email: string;
        password: string;
    }): Promise<any>;
    loginFWallet(credentials: {
        email: string;
        password: string;
    }): Promise<any>;
    loginRestaurant(credentials: {
        email: string;
        password: string;
    }): Promise<any>;
    loginCustomerCare(credentials: {
        email: string;
        password: string;
    }): Promise<any>;
    verifyEmail({ email, code }: {
        email: string;
        code: string;
    }): Promise<import("src/utils/createResponse").ApiResponse<any> | {
        message: string;
    }>;
}
