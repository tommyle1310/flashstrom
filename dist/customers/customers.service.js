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
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const update_customer_dto_1 = require("./dto/update-customer.dto");
const createResponse_1 = require("../utils/createResponse");
const users_repository_1 = require("../users/users.repository");
const restaurants_repository_1 = require("../restaurants/restaurants.repository");
const customers_repository_1 = require("./customers.repository");
const food_category_entity_1 = require("../food_categories/entities/food_category.entity");
const menu_item_entity_1 = require("../menu_items/entities/menu_item.entity");
const typeorm_1 = require("typeorm");
const order_entity_1 = require("../orders/entities/order.entity");
let CustomersService = class CustomersService {
    constructor(restaurantRepository, userRepository, dataSource, customerRepository) {
        this.restaurantRepository = restaurantRepository;
        this.userRepository = userRepository;
        this.dataSource = dataSource;
        this.customerRepository = customerRepository;
    }
    async create(createCustomerDto) {
        try {
            const existingUser = await this.userRepository.findById(createCustomerDto.user_id);
            if (!existingUser) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
            }
            const existingCustomer = await this.customerRepository.findByUserId(createCustomerDto.user_id);
            if (existingCustomer) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, 'Customer with this user ID already exists');
            }
            const newCustomer = await this.customerRepository.create(createCustomerDto);
            return (0, createResponse_1.createResponse)('OK', newCustomer, 'Customer created successfully');
        }
        catch (error) {
            console.error('Error creating customer:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while creating the customer');
        }
    }
    async searchRestaurantsByKeyword(keyword, page = 1, limit = 10) {
        try {
            const searchKeyword = keyword.trim().toLowerCase();
            const restaurantsByName = await this.restaurantRepository.repository.find({
                where: {
                    restaurant_name: (0, typeorm_1.ILike)(`%${searchKeyword}%`)
                },
                relations: ['specialize_in', 'address']
            });
            const foodCategories = await this.dataSource
                .getRepository(food_category_entity_1.FoodCategory)
                .find({
                where: {
                    name: (0, typeorm_1.ILike)(`%${searchKeyword}%`)
                }
            });
            const categoryIds = foodCategories.map(category => category.id);
            const restaurantsByCategory = categoryIds.length > 0
                ? await this.restaurantRepository.repository.find({
                    where: {
                        specialize_in: { id: (0, typeorm_1.In)(categoryIds) }
                    },
                    relations: ['specialize_in', 'address']
                })
                : [];
            const combinedRestaurants = [
                ...restaurantsByName,
                ...restaurantsByCategory
            ];
            const uniqueRestaurantsMap = new Map(combinedRestaurants.map(r => [r.id, r]));
            const uniqueRestaurants = Array.from(uniqueRestaurantsMap.values());
            const skip = (page - 1) * limit;
            const paginatedRestaurants = uniqueRestaurants.slice(skip, skip + limit);
            return (0, createResponse_1.createResponse)('OK', paginatedRestaurants, `Found ${paginatedRestaurants.length} restaurants matching keyword "${keyword}" (total: ${uniqueRestaurants.length})`);
        }
        catch (error) {
            console.error('Error searching restaurants:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while searching restaurants');
        }
    }
    async findAll() {
        try {
            const customers = await this.customerRepository.findAll();
            return (0, createResponse_1.createResponse)('OK', customers, 'Fetched all customers');
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching customers');
        }
    }
    async findCustomerById(id) {
        try {
            const customer = await this.customerRepository.findById(id);
            if (!customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
            }
            const user = await this.userRepository.findById(customer.user_id);
            if (!user) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'User not found');
            }
            const customerWithUserData = {
                ...customer,
                user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    phone: user.phone,
                    is_verified: user.is_verified
                }
            };
            return (0, createResponse_1.createResponse)('OK', customerWithUserData, 'Fetched customer and user data successfully');
        }
        catch (error) {
            console.error('Error fetching customer and user:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching the customer and user data');
        }
    }
    async update(id, updateCustomerDto) {
        try {
            const customer = await this.customerRepository.findById(id);
            if (!customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
            }
            const { favorite_restaurant, ...otherUpdateData } = updateCustomerDto;
            if (favorite_restaurant) {
                const currentFavoriteRestaurants = customer.favorite_restaurants || [];
                const restaurantIds = currentFavoriteRestaurants.map(r => r.id);
                if (restaurantIds.includes(favorite_restaurant)) {
                    customer.favorite_restaurants = currentFavoriteRestaurants.filter(r => r.id !== favorite_restaurant);
                }
                else {
                    const restaurant = await this.restaurantRepository.repository.findOne({
                        where: { id: favorite_restaurant }
                    });
                    if (!restaurant) {
                        return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant not found');
                    }
                    customer.favorite_restaurants = [
                        ...currentFavoriteRestaurants,
                        restaurant
                    ];
                }
            }
            Object.assign(customer, otherUpdateData);
            const updatedCustomer = await this.customerRepository.save(customer);
            console.log('check toggle favourite restaurant', id, updatedCustomer, 'customerdto', updateCustomerDto);
            return (0, createResponse_1.createResponse)('OK', updatedCustomer, 'Customer updated successfully');
        }
        catch (error) {
            console.error('Error updating customer:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while updating the customer');
        }
    }
    async remove(id) {
        try {
            await this.customerRepository.remove(id);
            return (0, createResponse_1.createResponse)('OK', null, 'Customer deleted successfully');
        }
        catch (error) {
            console.error('Error deleting customer:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while deleting the customer');
        }
    }
    async updateEntityAvatar(uploadResult, entityId) {
        try {
            const customer = await this.customerRepository.findById(entityId);
            if (!customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
            }
            const updateDto = new update_customer_dto_1.UpdateCustomerDto();
            updateDto.avatar = {
                url: uploadResult.url,
                key: uploadResult.public_id
            };
            const updatedCustomer = await this.customerRepository.update(entityId, updateDto);
            return (0, createResponse_1.createResponse)('OK', updatedCustomer, 'Customer avatar updated successfully');
        }
        catch (error) {
            console.error('Error updating customer avatar:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while updating the customer avatar');
        }
    }
    isRestaurantOpen(restaurant) {
        const currentDay = new Date().getDay();
        const currentTime = new Date().getHours() * 60 + new Date().getMinutes();
        const openingHours = restaurant.opening_hours;
        const dayOfWeek = Object.keys(openingHours)[currentDay];
        if (openingHours[dayOfWeek]) {
            const { from, to } = openingHours[dayOfWeek];
            return currentTime >= from && currentTime <= to;
        }
        return false;
    }
    async getFavoriteRestaurants(customerId) {
        try {
            const customer = await this.customerRepository.findById(customerId);
            if (!customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
            }
            const favoriteRestaurantIds = customer.favorite_restaurants.map(r => r.id);
            if (!favoriteRestaurantIds || favoriteRestaurantIds.length === 0) {
                return (0, createResponse_1.createResponse)('OK', [], 'No favorite restaurants found for this customer');
            }
            const favoriteRestaurants = await this.restaurantRepository.repository.find({
                where: { id: (0, typeorm_1.In)(favoriteRestaurantIds) },
                relations: ['specialize_in', 'address'],
                select: {
                    id: true,
                    restaurant_name: true,
                    avatar: { url: true, key: true },
                    address: {
                        id: true,
                        street: true,
                        city: true,
                        postal_code: true,
                        location: { lat: true, lng: true }
                    }
                }
            });
            return (0, createResponse_1.createResponse)('OK', favoriteRestaurants, `Fetched ${favoriteRestaurants.length} favorite restaurants successfully`);
        }
        catch (error) {
            console.error('Error fetching favorite restaurants:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching favorite restaurants');
        }
    }
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
                Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    async getAllRestaurants(customerId) {
        try {
            const customer = await this.customerRepository.findById(customerId);
            if (!customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
            }
            const { preferred_category, restaurant_history, address: customerAddress } = customer;
            const customerAddressArray = customerAddress;
            const restaurants = await this.restaurantRepository.findAll();
            const prioritizedRestaurants = restaurants
                .map(restaurant => {
                const customerLocation = (customerAddressArray &&
                    customerAddressArray[0]?.location);
                const restaurantAddress = restaurant.address;
                if (!customerLocation || !restaurantAddress?.location) {
                    return { ...restaurant, priorityScore: 0 };
                }
                const restaurantLocation = restaurantAddress.location;
                const isPreferred = restaurant.specialize_in.some(category => preferred_category.includes(category));
                const visitHistory = restaurant_history
                    ? restaurant_history.find(history => history.restaurant_id === restaurant.id)
                    : null;
                const visitCount = visitHistory ? visitHistory.count : 0;
                const distance = this.calculateDistance(customerLocation.lat, customerLocation.lng, restaurantLocation.lat, restaurantLocation.lng);
                const distanceWeight = 1 / (distance + 1);
                const priorityScore = (isPreferred ? 1 : 0) * 3 + visitCount * 2 + distanceWeight * 5;
                return {
                    ...restaurant,
                    priorityScore
                };
            })
                .sort((a, b) => b.priorityScore - a.priorityScore);
            return (0, createResponse_1.createResponse)('OK', prioritizedRestaurants, 'Fetched and prioritized restaurants successfully');
        }
        catch (error) {
            console.error('Error fetching and prioritizing restaurants:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching and prioritizing restaurants');
        }
    }
    async getAllOrders(customerId) {
        try {
            const customer = await this.customerRepository.findById(customerId);
            if (!customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
            }
            const orders = await this.dataSource.getRepository(order_entity_1.Order).find({
                where: { customer_id: customerId },
                relations: [
                    'restaurant',
                    'customer',
                    'driver',
                    'customerAddress',
                    'restaurantAddress'
                ],
                select: {
                    id: true,
                    customer_id: true,
                    restaurant_id: true,
                    driver_id: true,
                    status: true,
                    total_amount: true,
                    payment_status: true,
                    payment_method: true,
                    customer_location: true,
                    restaurant_location: true,
                    order_items: true,
                    customer_note: true,
                    restaurant_note: true,
                    distance: true,
                    delivery_fee: true,
                    updated_at: true,
                    order_time: true,
                    delivery_time: true,
                    tracking_info: true,
                    restaurant: {
                        id: true,
                        restaurant_name: true,
                        address_id: true,
                        avatar: {
                            url: true,
                            key: true
                        }
                    }
                }
            });
            if (!orders || orders.length === 0) {
                return (0, createResponse_1.createResponse)('OK', [], 'No orders found for this customer');
            }
            const restaurantIds = orders.map(order => order.restaurant_id);
            const specializations = await this.dataSource
                .createQueryBuilder()
                .select('rs.restaurant_id', 'restaurant_id')
                .addSelect('array_agg(fc.name)', 'specializations')
                .from('restaurant_specializations', 'rs')
                .leftJoin('food_categories', 'fc', 'fc.id = rs.food_category_id')
                .where('rs.restaurant_id IN (:...restaurantIds)', { restaurantIds })
                .groupBy('rs.restaurant_id')
                .getRawMany();
            const specializationMap = new Map(specializations.map(spec => [spec.restaurant_id, spec.specializations]));
            const populatedOrders = await Promise.all(orders.map(async (order) => {
                const populatedOrderItems = await Promise.all(order.order_items.map(async (item) => {
                    const menuItem = await this.dataSource
                        .getRepository(menu_item_entity_1.MenuItem)
                        .findOne({
                        where: { id: item.item_id },
                        relations: ['restaurant', 'variants'],
                        select: {
                            id: true,
                            name: true,
                            price: true,
                            avatar: {
                                url: true,
                                key: true
                            },
                            restaurant: {
                                id: true,
                                restaurant_name: true,
                                address_id: true,
                                avatar: {
                                    url: true,
                                    key: true
                                }
                            }
                        }
                    });
                    return {
                        ...item,
                        menu_item: menuItem || null
                    };
                }));
                const restaurantSpecializations = specializationMap.get(order.restaurant_id) || [];
                return {
                    ...order,
                    order_items: populatedOrderItems,
                    customer_address: order.customerAddress,
                    restaurant_address: order.restaurantAddress,
                    restaurant: {
                        ...order.restaurant,
                        specialize_in: restaurantSpecializations
                    }
                };
            }));
            return (0, createResponse_1.createResponse)('OK', populatedOrders, 'Fetched orders successfully');
        }
        catch (error) {
            console.error('Error fetching orders:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while fetching orders');
        }
    }
    async findOne(conditions) {
        try {
            const customer = await this.customerRepository.findOneBy(conditions);
            if (!customer) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Customer not found');
            }
            return (0, createResponse_1.createResponse)('OK', customer, 'Customer found successfully');
        }
        catch (error) {
            console.error('Error finding customer:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while finding the customer');
        }
    }
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [restaurants_repository_1.RestaurantsRepository,
        users_repository_1.UserRepository,
        typeorm_1.DataSource,
        customers_repository_1.CustomersRepository])
], CustomersService);
//# sourceMappingURL=customers.service.js.map