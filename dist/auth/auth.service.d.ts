import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Enum_UserType } from 'src/types/Payload';
import { CartItemsService } from 'src/cart_items/cart_items.service';
import { UserRepository } from 'src/users/users.repository';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { RestaurantsRepository } from 'src/restaurants/restaurants.repository';
import { CustomersRepository } from 'src/customers/customers.repository';
import { DriversRepository } from 'src/drivers/drivers.repository';
import { CustomerCaresRepository } from 'src/customer_cares/customer_cares.repository';
export declare class AuthService {
    private readonly userRepository;
    private readonly fWalletsRepository;
    private readonly restaurantsRepository;
    private readonly customersRepository;
    private readonly driverRepository;
    private readonly customerCareRepository;
    private readonly jwtService;
    private readonly cartItemService;
    constructor(userRepository: UserRepository, fWalletsRepository: FWalletsRepository, restaurantsRepository: RestaurantsRepository, customersRepository: CustomersRepository, driverRepository: DriversRepository, customerCareRepository: CustomerCaresRepository, jwtService: JwtService, cartItemService: CartItemsService);
    register(userData: any, type: Enum_UserType): Promise<any>;
    login({ email, password }: {
        email: string;
        password: string;
    }, type: Enum_UserType): Promise<any>;
    private validateRegistrationInput;
    private validateLoginInput;
    findUserByEmail(email: string): Promise<User | null>;
    private validateUserCredentials;
    private createBasePayload;
    private handleUserTypeLogin;
    private handleDriverLogin;
    private handleCustomerLogin;
    private handleFWalletLogin;
    private handleRestaurantOwnerLogin;
    private handleCustomerCareLogin;
    private handleExistingUserRegistration;
    private createNewUserRegistration;
    validateUser(payload: any): Promise<User>;
    hasRole(userId: string, role: Enum_UserType): Promise<boolean>;
}
