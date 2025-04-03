"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt = require("bcryptjs");
const jwt_1 = require("@nestjs/jwt");
const createResponse_1 = require("../utils/createResponse");
const Payload_1 = require("../types/Payload");
const cart_items_service_1 = require("../cart_items/cart_items.service");
const users_repository_1 = require("../users/users.repository");
const fwallets_repository_1 = require("../fwallets/fwallets.repository");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const customers_repository_1 = require("../customers/customers.repository");
const drivers_repository_1 = require("../drivers/drivers.repository");
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const customer_cares_repository_1 = require("../customer_cares/customer_cares.repository");
const email_service_1 = require("../mailer/email.service");
let AuthService = class AuthService {
    constructor(userRepository, fWalletsRepository, restaurantsRepository, customersRepository, driverRepository, customerCareRepository, jwtService, cartItemService, emailService) {
        this.userRepository = userRepository;
        this.fWalletsRepository = fWalletsRepository;
        this.restaurantsRepository = restaurantsRepository;
        this.customersRepository = customersRepository;
        this.driverRepository = driverRepository;
        this.customerCareRepository = customerCareRepository;
        this.jwtService = jwtService;
        this.cartItemService = cartItemService;
        this.emailService = emailService;
    }
    async register(userData, type) {
        console.log('Starting registration process with data:', { userData, type });
        const { email, password, phone } = userData;
        console.log('Extracted credentials:', { email, phone });
        if (!this.validateRegistrationInput(email, password)) {
            console.log('Registration validation failed - missing email or password');
            return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Email & Password cannot be empty');
        }
        console.log('Registration input validation passed');
        const existingUser = await this.findUserByEmail(email);
        console.log('Existing user check result:', { exists: !!existingUser });
        if (existingUser) {
            console.log('Found existing user, handling existing user registration');
            return this.handleExistingUserRegistration(existingUser, userData, type);
        }
        console.log('No existing user found, creating new registration');
        return this.createNewUserRegistration(userData, type, phone);
    }
    async login({ email, password }, type) {
        if (!this.validateLoginInput(email, password)) {
            return (0, createResponse_1.createResponse)('MissingInput', null, 'Email & Password cannot be empty');
        }
        const user = await this.validateUserCredentials(email, password);
        if (!user) {
            return (0, createResponse_1.createResponse)('Unauthorized', null, 'Invalid credentials');
        }
        const basePayload = this.createBasePayload(user);
        return this.handleUserTypeLogin(user, type, basePayload);
    }
    async validateRegistrationInput(email, password) {
        return Boolean(email && password);
    }
    async validateLoginInput(email, password) {
        return Boolean(email && password);
    }
    async findUserByEmail(email) {
        return this.userRepository.findOne({ where: { email } });
    }
    async validateUserCredentials(email, password) {
        const user = await this.findUserByEmail(email);
        if (!user)
            return null;
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid)
            return null;
        return user;
    }
    createBasePayload(user) {
        return {
            user_id: user.id,
            email: user.email,
            user_type: user.user_type,
            first_name: user.first_name,
            last_name: user.last_name,
            app_preferences: user.app_preferences
        };
    }
    async handleUserTypeLogin(user, type, basePayload) {
        const loginHandlers = {
            DRIVER: () => this.handleDriverLogin(user, basePayload),
            CUSTOMER: () => this.handleCustomerLogin(user, basePayload),
            F_WALLET: () => this.handleFWalletLogin(user, basePayload),
            RESTAURANT_OWNER: () => this.handleRestaurantOwnerLogin(user, basePayload),
            CUSTOMER_CARE_REPRESENTATIVE: () => this.handleCustomerCareLogin(user, basePayload)
        };
        const handler = loginHandlers[type];
        if (!handler) {
            return (0, createResponse_1.createResponse)('Unauthorized', null, 'Invalid user type');
        }
        return handler();
    }
    async handleDriverLogin(user, basePayload) {
        const userWithRole = await this.driverRepository.findOne({
            user_id: user.id
        });
        if (!userWithRole) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
        }
        const fWalletData = await this.fWalletsRepository.findByUserId(user.id);
        if (!fWalletData) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
        }
        const driverPayload = {
            ...basePayload,
            id: userWithRole.id,
            logged_in_as: Payload_1.Enum_UserType.DRIVER,
            user_id: userWithRole.user_id,
            first_name: userWithRole.first_name,
            last_name: userWithRole.last_name,
            driver_id: userWithRole.id,
            contact_email: userWithRole.contact_email,
            contact_phone: userWithRole.contact_phone,
            vehicle: userWithRole.vehicle,
            current_location: userWithRole.current_location,
            avatar: userWithRole.avatar,
            available_for_work: userWithRole.available_for_work,
            fWallet_id: fWalletData.id,
            fWallet_balance: fWalletData.balance
        };
        const accessToken = this.jwtService.sign(driverPayload);
        return (0, createResponse_1.createResponse)('OK', {
            access_token: accessToken,
            user_data: userWithRole
        }, 'Login successful');
    }
    async handleCustomerLogin(user, basePayload) {
        const userWithRole = await this.customersRepository.findByUserId(user.id);
        if (!userWithRole) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
        }
        const cartItems = await this.cartItemService.findAll({
            customer_id: userWithRole.id
        });
        const fwallet = await this.fWalletsRepository.findByUserId(user.id);
        const customerPayload = {
            ...basePayload,
            id: userWithRole.id,
            logged_in_as: Payload_1.Enum_UserType.CUSTOMER,
            fWallet_id: fwallet?.id,
            fWallet_balance: fwallet?.balance,
            preferred_category: userWithRole.preferred_category,
            favorite_restaurants: userWithRole.favorite_restaurants,
            favorite_items: userWithRole.favorite_items,
            user_id: user.id,
            avatar: userWithRole?.avatar,
            support_tickets: userWithRole.support_tickets,
            address: userWithRole?.address,
            cart_items: cartItems.data
        };
        const accessToken = this.jwtService.sign(customerPayload);
        return (0, createResponse_1.createResponse)('OK', { access_token: accessToken }, 'Login successful');
    }
    async handleFWalletLogin(user, basePayload) {
        const userWithRole = await this.fWalletsRepository.findByUserId(user.id);
        if (!userWithRole) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'FWallet not found');
        }
        const fWalletPayload = {
            ...basePayload,
            id: userWithRole.id,
            logged_in_as: Payload_1.Enum_UserType.F_WALLET,
            user_id: userWithRole.user_id,
            balance: userWithRole.balance,
            fWallet_id: userWithRole.id
        };
        const accessToken = this.jwtService.sign(fWalletPayload);
        return (0, createResponse_1.createResponse)('OK', { access_token: accessToken }, 'Login successful');
    }
    async handleRestaurantOwnerLogin(user, basePayload) {
        const userWithRole = await this.restaurantsRepository.findByOwnerId(user.id);
        if (!userWithRole) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant owner not found');
        }
        const restaurantPayload = {
            ...basePayload,
            id: userWithRole.id,
            logged_in_as: Payload_1.Enum_UserType.RESTAURANT_OWNER,
            owner_id: userWithRole.owner_id,
            owner_name: userWithRole.owner_name,
            restaurant_id: userWithRole.id ?? userWithRole.id,
            address: userWithRole.address,
            restaurant_name: userWithRole.restaurant_name,
            contact_email: userWithRole.contact_email,
            contact_phone: userWithRole.contact_phone,
            created_at: userWithRole.created_at,
            updated_at: userWithRole.updated_at,
            avatar: userWithRole.avatar,
            images_gallery: userWithRole.images_gallery,
            status: userWithRole.status,
            promotions: userWithRole.promotions,
            ratings: userWithRole.ratings,
            specialize_in: userWithRole.specialize_in,
            opening_hours: userWithRole.opening_hours
        };
        const accessToken = this.jwtService.sign(restaurantPayload);
        return (0, createResponse_1.createResponse)('OK', {
            access_token: accessToken,
            user_data: userWithRole
        }, 'Login successful');
    }
    async handleCustomerCareLogin(user, basePayload) {
        console.log('cehck user', user);
        const userWithRole = await this.customerCareRepository.findByUserId(user.id);
        console.log('check suerwithrole', userWithRole);
        if (!userWithRole) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Customer Care representative not found');
        }
        console.log('check user with role', userWithRole, 'user', user);
        const customerCarePayload = {
            ...basePayload,
            id: userWithRole.id,
            logged_in_as: Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE,
            user_id: userWithRole.user_id,
            first_name: userWithRole.first_name,
            last_name: userWithRole.last_name,
            contact_email: userWithRole.contact_email,
            contact_phone: userWithRole.contact_phone,
            assigned_tickets: userWithRole.assigned_tickets,
            avatar: userWithRole.avatar,
            available_for_work: userWithRole.available_for_work,
            is_assigned: userWithRole.is_assigned
        };
        const accessToken = this.jwtService.sign(customerCarePayload);
        return (0, createResponse_1.createResponse)('OK', {
            access_token: accessToken,
            user_data: userWithRole
        }, 'Login successful');
    }
    async handleExistingUserRegistration(existingUser, userData, type) {
        if (existingUser && Array.isArray(existingUser.user_type)) {
            const userTypes = existingUser.user_type.map(t => String(t));
            console.log('Checking user types:', {
                existingTypes: userTypes,
                typeToCheck: type,
                includes: userTypes.includes(String(type))
            });
            if (userTypes.includes(String(type))) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, `${type} with the same email already exists`);
            }
        }
        let newUserWithRole;
        let fWallet;
        switch (type) {
            case Payload_1.Enum_UserType.CUSTOMER:
                newUserWithRole = await this.customersRepository.create({
                    ...userData,
                    password: existingUser.password,
                    user_id: existingUser.id
                });
                break;
            case Payload_1.Enum_UserType.DRIVER:
                fWallet = await this.fWalletsRepository.findByUserId(existingUser.id);
                if (!fWallet) {
                    fWallet = await this.fWalletsRepository.create({
                        ...userData,
                        password: existingUser.password,
                        user_id: existingUser.id,
                        balance: 0
                    });
                    if (!existingUser.user_type.includes(Payload_1.Enum_UserType.F_WALLET)) {
                        existingUser.user_type.push(Payload_1.Enum_UserType.F_WALLET);
                    }
                }
                newUserWithRole = await this.driverRepository.create({
                    user_id: existingUser.id,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    contact_email: [
                        { title: 'Primary', is_default: true, email: userData.email }
                    ],
                    contact_phone: [
                        { title: 'Primary', is_default: true, number: userData.phone }
                    ],
                    available_for_work: false,
                    is_on_delivery: false,
                    active_points: 0,
                    current_order_id: [],
                    vehicle: {
                        license_plate: '',
                        model: '',
                        color: ''
                    },
                    current_location: {
                        lat: 0,
                        lng: 0
                    },
                    rating: {
                        average_rating: 0,
                        review_count: 0
                    }
                });
                break;
            case Payload_1.Enum_UserType.RESTAURANT_OWNER:
                if (!userData.address_id) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Address is required');
                }
                if (!userData.owner_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Owner name is required');
                }
                if (!userData.restaurant_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Restaurant name is required');
                }
                if (!userData.contact_email) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Contact email is required');
                }
                if (!userData.contact_phone) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Contact phone is required');
                }
                fWallet = await this.fWalletsRepository.findByUserId(existingUser.id);
                if (!fWallet) {
                    fWallet = await this.fWalletsRepository.create({
                        ...userData,
                        password: existingUser.password,
                        user_id: existingUser.id,
                        balance: 0
                    });
                    if (!existingUser.user_type.includes(Payload_1.Enum_UserType.F_WALLET)) {
                        existingUser.user_type.push(Payload_1.Enum_UserType.F_WALLET);
                    }
                }
                newUserWithRole = await this.restaurantsRepository.create({
                    ...userData,
                    password: existingUser.password,
                    owner_id: existingUser.id,
                    status: {
                        is_open: false,
                        is_active: false,
                        is_accepted_orders: false
                    },
                    opening_hours: {
                        mon: { from: 8, to: 17 },
                        tue: { from: 8, to: 17 },
                        wed: { from: 8, to: 17 },
                        thu: { from: 8, to: 17 },
                        fri: { from: 8, to: 17 },
                        sat: { from: 8, to: 17 },
                        sun: { from: 8, to: 17 }
                    }
                });
                break;
            case Payload_1.Enum_UserType.F_WALLET:
                newUserWithRole = await this.fWalletsRepository.create({
                    ...userData,
                    password: existingUser.password,
                    user_id: existingUser.id,
                    balance: 0
                });
                break;
            case Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE:
                newUserWithRole = await this.customerCareRepository.create({
                    user_id: existingUser.id,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    contact_email: [
                        { title: 'Primary', is_default: true, email: userData.email }
                    ],
                    contact_phone: [
                        { title: 'Primary', is_default: true, number: userData.phone }
                    ],
                    assigned_tickets: [],
                    available_for_work: false,
                    is_assigned: false,
                    created_at: Math.floor(Date.now() / 1000),
                    updated_at: Math.floor(Date.now() / 1000),
                    last_login: Math.floor(Date.now() / 1000)
                });
                break;
            default:
                return (0, createResponse_1.createResponse)('Unauthorized', null, 'Invalid user type provided');
        }
        switch (type) {
            case Payload_1.Enum_UserType.CUSTOMER:
                await this.customersRepository.update(newUserWithRole.id, newUserWithRole);
                break;
            case Payload_1.Enum_UserType.DRIVER:
                await this.driverRepository.update(newUserWithRole.id, newUserWithRole);
                break;
            case Payload_1.Enum_UserType.RESTAURANT_OWNER:
                await this.restaurantsRepository.update(newUserWithRole.id, newUserWithRole);
                break;
            case Payload_1.Enum_UserType.F_WALLET:
                await this.fWalletsRepository.update(newUserWithRole.id, newUserWithRole);
                break;
        }
        if (!existingUser.user_type.includes(type)) {
            existingUser.user_type.push(type);
            await this.userRepository.update(existingUser.id, {
                user_type: existingUser.user_type
            });
        }
        const responseData = {
            id: existingUser.id,
            user_id: existingUser.id,
            email: existingUser.email,
            first_name: existingUser.first_name,
            last_name: existingUser.last_name,
            user_type: existingUser.user_type,
            data: newUserWithRole
        };
        if (fWallet && (type === 'DRIVER' || type === 'RESTAURANT_OWNER')) {
            responseData['fWallet'] = fWallet;
        }
        return (0, createResponse_1.createResponse)('OK', responseData, `${type} created successfully with existing user`);
    }
    async createNewUserRegistration(userData, type, phone) {
        const { email, password } = userData;
        if (!this.validateRegistrationInput(email, password)) {
            return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Email & Password cannot be empty');
        }
        switch (type) {
            case Payload_1.Enum_UserType.CUSTOMER:
                if (!userData.first_name || !userData.last_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'First name and last name are required');
                }
                break;
            case Payload_1.Enum_UserType.DRIVER:
                if (!userData.first_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'First name is required');
                }
                if (!userData.last_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Last name is required');
                }
                if (!userData.contact_email) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Contact email is required');
                }
                if (!userData.contact_phone) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Contact phone is required');
                }
                break;
            case Payload_1.Enum_UserType.RESTAURANT_OWNER:
                const { contact_email, contact_phone, opening_hours, owner_name, restaurant_name, status } = userData;
                if (!contact_email ||
                    !contact_phone ||
                    !opening_hours ||
                    !owner_name ||
                    !restaurant_name ||
                    !status) {
                    console.log('fall here', opening_hours);
                    return (0, createResponse_1.createResponse)('MissingInput', null, 'Missing required fields: contact_email, contact_phone, opening_hours, owner_name, restaurant_name, status');
                }
                if (!userData.restaurant_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Restaurant name is required');
                }
                if (!userData.owner_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Owner name is required');
                }
                if (!userData.address_id) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'Address is required');
                }
                break;
            case Payload_1.Enum_UserType.F_WALLET:
                if (!userData.first_name || !userData.last_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'First name and last name are required');
                }
                break;
            case Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE:
                if (!userData.first_name || !userData.last_name) {
                    return (0, createResponse_1.createResponse)('InvalidFormatInput', null, 'First name and last name are required');
                }
                break;
            default:
                return (0, createResponse_1.createResponse)('Unauthorized', null, 'Invalid user type provided');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await this.userRepository.create({
            ...userData,
            id: `USR_${(0, uuid_1.v4)()}`,
            phone,
            password: hashedPassword,
            verification_code: Math.floor(Math.random() * 1000000),
            is_verified: false,
            created_at: new Date(),
            updated_at: new Date(),
            user_type: [type]
        });
        await this.userRepository.update(newUser.id, {
            user_type: newUser.user_type
        });
        let newUserWithRole;
        let fWallet;
        switch (type) {
            case Payload_1.Enum_UserType.CUSTOMER:
                fWallet = await this.fWalletsRepository.create({
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id,
                    balance: 0
                });
                newUser.user_type.push(Payload_1.Enum_UserType.F_WALLET);
                await this.userRepository.update(newUser.id, {
                    user_type: newUser.user_type
                });
                newUserWithRole = await this.customersRepository.create({
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id
                });
                break;
            case Payload_1.Enum_UserType.DRIVER:
                fWallet = await this.fWalletsRepository.create({
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id,
                    balance: 0
                });
                newUser.user_type.push(Payload_1.Enum_UserType.F_WALLET);
                await this.userRepository.update(newUser.id, {
                    user_type: newUser.user_type
                });
                newUserWithRole = await this.driverRepository.create({
                    user_id: newUser.id,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    contact_email: [
                        { title: 'Primary', is_default: true, email: userData.email }
                    ],
                    contact_phone: [
                        { title: 'Primary', is_default: true, number: userData.phone }
                    ],
                    available_for_work: false,
                    is_on_delivery: false,
                    active_points: 0,
                    current_order_id: [],
                    vehicle: {
                        license_plate: '',
                        model: '',
                        color: ''
                    },
                    current_location: {
                        lat: 0,
                        lng: 0
                    },
                    rating: {
                        average_rating: 0,
                        review_count: 0
                    }
                });
                break;
            case Payload_1.Enum_UserType.RESTAURANT_OWNER:
                fWallet = await this.fWalletsRepository.create({
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id,
                    balance: 0
                });
                newUser.user_type.push(Payload_1.Enum_UserType.F_WALLET);
                await this.userRepository.update(newUser.id, {
                    user_type: newUser.user_type
                });
                newUserWithRole = await this.restaurantsRepository.create({
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id,
                    owner_id: newUser.id
                });
                console.log('chekc newuserwithrole restaurant', newUserWithRole);
                break;
            case Payload_1.Enum_UserType.F_WALLET:
                console.log('check what happen', {
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id,
                    balance: 0
                });
                newUserWithRole = await this.fWalletsRepository.create({
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id,
                    balance: 0
                });
                break;
            case Payload_1.Enum_UserType.CUSTOMER_CARE_REPRESENTATIVE:
                fWallet = await this.fWalletsRepository.create({
                    ...userData,
                    password: hashedPassword,
                    user_id: newUser.id,
                    balance: 0
                });
                newUser.user_type.push(Payload_1.Enum_UserType.F_WALLET);
                await this.userRepository.update(newUser.id, {
                    user_type: newUser.user_type
                });
                newUserWithRole = await this.customerCareRepository.create({
                    user_id: newUser.id,
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    contact_email: [
                        { title: 'Primary', is_default: true, email: userData.email }
                    ],
                    contact_phone: [
                        { title: 'Primary', is_default: true, number: userData.phone }
                    ],
                    assigned_tickets: [],
                    available_for_work: false,
                    is_assigned: false,
                    created_at: Math.floor(Date.now() / 1000),
                    updated_at: Math.floor(Date.now() / 1000),
                    last_login: Math.floor(Date.now() / 1000)
                });
                break;
            default:
                return (0, createResponse_1.createResponse)('Unauthorized', null, 'Invalid user type provided');
        }
        const responseData = {
            id: newUser.id,
            user_id: newUser.id,
            phone,
            email: newUser.email,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            user_type: newUser.user_type,
            data: newUserWithRole
        };
        if (fWallet &&
            (type === Payload_1.Enum_UserType.DRIVER || type === Payload_1.Enum_UserType.RESTAURANT_OWNER)) {
            responseData['fWallet'] = fWallet;
        }
        return (0, createResponse_1.createResponse)('OK', responseData, `${type} registered successfully`);
    }
    async validateUser(payload) {
        return this.userRepository.findById(payload.userId);
    }
    async hasRole(userId, role) {
        const user = await this.userRepository.findById(userId);
        return user?.user_type.includes(role) || false;
    }
    async requestPasswordReset(email) {
        const user = await this.findUserByEmail(email);
        if (!user) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'User with this email not found');
        }
        const resetToken = (0, uuid_1.v4)();
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
        await this.userRepository.update(user.id, {
            reset_token: resetToken,
            reset_token_expiry: resetTokenExpiry
        });
        await this.emailService.sendPasswordResetEmail(email, resetToken, user.first_name);
        return (0, createResponse_1.createResponse)('OK', null, 'Password reset email sent successfully');
    }
    async resetPassword(token, newPassword) {
        const user = await this.userRepository.findOne({
            where: { reset_token: token }
        });
        if (!user) {
            return (0, createResponse_1.createResponse)('Unauthorized', null, 'Invalid or expired token');
        }
        if (user.reset_token_expiry < new Date()) {
            return (0, createResponse_1.createResponse)('Unauthorized', null, 'Token has expired');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.userRepository.update(user.id, {
            password: hashedPassword,
            reset_token: null,
            reset_token_expiry: null
        });
        return (0, createResponse_1.createResponse)('OK', null, 'Password reset successfully');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UserRepository,
        fwallets_repository_1.FWalletsRepository,
        restaurants_repository_1.RestaurantsRepository,
        customers_repository_1.CustomersRepository,
        drivers_repository_1.DriversRepository,
        customer_cares_repository_1.CustomerCaresRepository,
        jwt_1.JwtService,
        cart_items_service_1.CartItemsService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map