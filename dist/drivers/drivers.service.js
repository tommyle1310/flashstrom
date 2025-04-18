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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const driver_entity_1 = require("./entities/driver.entity");
const createResponse_1 = require("../utils/createResponse");
const commonFunctions_1 = require("../utils/commonFunctions");
const address_book_repository_1 = require("../address_book/address_book.repository");
const drivers_repository_1 = require("./drivers.repository");
const order_entity_1 = require("../orders/entities/order.entity");
const harded_code_test_1 = require("../utils/harded_code_test");
const orders_repository_1 = require("../orders/orders.repository");
const typeorm_1 = require("typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const driver_progress_stages_repository_1 = require("../driver_progress_stages/driver_progress_stages.repository");
const online_sessions_service_1 = require("../online-sessions/online-sessions.service");
const driver_stats_records_service_1 = require("../driver_stats_records/driver_stats_records.service");
const ratings_reviews_repository_1 = require("../ratings_reviews/ratings_reviews.repository");
let DriversService = class DriversService {
    constructor(driversRepository, driverEntityRepository, ordersRepository, driverStatsService, addressRepository, driverProgressStageRepository, onlineSessionsService, dataSource, ratingsReviewsRepository) {
        this.driversRepository = driversRepository;
        this.driverEntityRepository = driverEntityRepository;
        this.ordersRepository = ordersRepository;
        this.driverStatsService = driverStatsService;
        this.addressRepository = addressRepository;
        this.driverProgressStageRepository = driverProgressStageRepository;
        this.onlineSessionsService = onlineSessionsService;
        this.dataSource = dataSource;
        this.ratingsReviewsRepository = ratingsReviewsRepository;
    }
    async setAvailability(id) {
        try {
            const driver = await this.driversRepository.findById(id);
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            const newAvailability = !driver.available_for_work;
            driver.available_for_work = newAvailability;
            const savedDriver = await this.driversRepository.save(driver);
            if (newAvailability) {
                const createOnlineSessionDto = {
                    driver_id: driver.id,
                    end_time: null,
                    start_time: Math.floor(Date.now() / 1000),
                    is_active: true
                };
                console.log(`[DEBUG] Creating OnlineSession for driver ${driver.id}:`, createOnlineSessionDto);
                const session = await this.onlineSessionsService.create(createOnlineSessionDto);
                console.log(`[DEBUG] Created OnlineSession:`, session);
            }
            else {
                const activeSession = await this.onlineSessionsService.findOneByDriverIdAndActive(driver.id);
                if (activeSession) {
                    console.log(`[DEBUG] Ending OnlineSession ${activeSession.id} for driver ${driver.id}`);
                    await this.onlineSessionsService.endSession(activeSession.id);
                }
                else {
                    console.log(`[DEBUG] No active OnlineSession found for driver ${driver.id}`);
                }
            }
            await this.driverStatsService.updateStatsForDriver(driver.id, 'daily');
            return (0, createResponse_1.createResponse)('OK', savedDriver, 'Driver availability updated successfully');
        }
        catch (error) {
            return this.handleError('Error updating driver availability:', error);
        }
    }
    async create(createDriverDto) {
        try {
            const existingDriver = await this.driversRepository.findByUserId(createDriverDto.user_id);
            if (existingDriver) {
                return (0, createResponse_1.createResponse)('DuplicatedRecord', null, 'Driver with this user ID already exists');
            }
            const newDriver = await this.driversRepository.create(createDriverDto);
            return (0, createResponse_1.createResponse)('OK', newDriver, 'Driver created successfully');
        }
        catch (error) {
            console.error('Error creating driver:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while creating the driver');
        }
    }
    async findAll() {
        try {
            const drivers = await this.driverEntityRepository.find();
            return (0, createResponse_1.createResponse)('OK', drivers, 'Fetched all drivers');
        }
        catch (error) {
            return this.handleError('Error fetching drivers:', error);
        }
    }
    async findDriverById(id) {
        try {
            const driver = await this.driversRepository.findById(id);
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            return (0, createResponse_1.createResponse)('OK', driver, 'Driver retrieved successfully');
        }
        catch (error) {
            console.error('Error finding driver:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error retrieving driver');
        }
    }
    async findOne(conditions) {
        try {
            const driver = await this.driversRepository.findOne(conditions);
            return this.handleDriverResponse(driver);
        }
        catch (error) {
            return this.handleError('Error fetching driver:', error);
        }
    }
    async update(id, updateDriverDto) {
        try {
            const driver = await this.driversRepository.findById(id);
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            const updatedDriver = await this.driversRepository.update(id, updateDriverDto);
            return (0, createResponse_1.createResponse)('OK', updatedDriver, 'Driver updated successfully');
        }
        catch (error) {
            return this.handleError('Error updating driver:', error);
        }
    }
    async remove(id) {
        try {
            const deletedDriver = await this.driversRepository.remove(id);
            if (!deletedDriver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            return (0, createResponse_1.createResponse)('OK', null, 'Driver deleted successfully');
        }
        catch (error) {
            return this.handleError('Error deleting driver:', error);
        }
    }
    async updateEntityAvatar(uploadResult, entityId) {
        try {
            const driver = await this.driversRepository.findById(entityId);
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            driver.avatar = { url: uploadResult.url, key: uploadResult.public_id };
            const savedDriver = await this.driversRepository.save(driver);
            return this.handleDriverResponse(savedDriver);
        }
        catch (error) {
            return this.handleError('Error updating driver avatar:', error);
        }
    }
    async prioritizeAndAssignDriver(listAvailableDrivers, orderDetails) {
        try {
            if (!listAvailableDrivers?.length) {
                return (0, createResponse_1.createResponse)('NoDrivers', [], 'No available drivers found');
            }
            const restaurantLocation = await this.getRestaurantLocation(orderDetails.restaurant_location);
            if (!restaurantLocation) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Restaurant location not found');
            }
            const specificDriver = listAvailableDrivers.find(driver => driver.id === harded_code_test_1.HARDED_CODE_TEST.prioritised_drivers[0]);
            if (!specificDriver) {
                return (0, createResponse_1.createResponse)('NotFound', [], 'Prioritized driver not found in available list');
            }
            const driver = await this.driverEntityRepository.findOne({
                where: { id: specificDriver.id },
                relations: ['current_orders']
            });
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found in database');
            }
            if (driver.current_orders.length > 3) {
                return (0, createResponse_1.createResponse)('DRIVER_MAXIMUM_ORDER', null, 'Driver has too many current orders');
            }
            console.log('check drivererast', driver);
            const driverResult = driver ? [driver] : [];
            return (0, createResponse_1.createResponse)('OK', driverResult, 'Driver selected successfully');
        }
        catch (error) {
            return this.handleError('Error prioritizing drivers:', error);
        }
    }
    async updateDriverDeliveryStatus(driverId, orderId, status) {
        try {
            const driver = await this.driversRepository.findById(driverId, {
                relations: ['current_orders']
            });
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            const updateData = {
                is_on_delivery: status,
                created_at: driver.created_at,
                updated_at: Math.floor(Date.now() / 1000),
                last_login: driver.last_login
            };
            if (status) {
                const newOrder = new order_entity_1.Order();
                newOrder.id = orderId;
                updateData.current_orders = [
                    ...(driver.current_orders || []),
                    newOrder
                ];
                updateData.active_points = (driver.active_points || 0) + 1;
            }
            else {
                updateData.current_orders = (driver.current_orders || []).filter(order => order.id !== orderId);
            }
            const updatedDriver = await this.driversRepository.update(driverId, updateData);
            return (0, createResponse_1.createResponse)('OK', updatedDriver, 'Driver status updated successfully');
        }
        catch (error) {
            console.error('Error updating driver delivery status:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while updating driver status');
        }
    }
    async updateDriverOrder(driverId, orderIds) {
        const driver = await this.driversRepository.findById(driverId, {
            relations: ['current_orders']
        });
        if (driver) {
            const orders = await Promise.all(orderIds.map(id => this.ordersRepository.findById(id)));
            driver.current_orders = orders.filter(order => order !== null);
            await this.driversRepository.save(driver);
        }
    }
    async addOrderToDriver(driverId, orderId, restaurantLocation, transactionalEntityManager) {
        try {
            console.log('Starting addOrderToDriver with driverId:', driverId, 'orderId:', orderId);
            const startTime = Date.now();
            const manager = transactionalEntityManager || this.dataSource.manager;
            console.log('addOrderToDriver - Fetching driver: START');
            const driver = await manager.findOne(driver_entity_1.Driver, {
                where: { id: driverId },
                relations: ['user']
            });
            console.log('addOrderToDriver - Fetching driver: END, Time:', Date.now() - startTime, 'ms');
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            console.log('addOrderToDriver - Calculating points and distance: START');
            const driverLat = driver.current_location?.lat || 10.826411;
            const driverLng = driver.current_location?.lng || 106.617353;
            const restLat = restaurantLocation.lat || 0;
            const restLng = restaurantLocation.lng || 0;
            const points = this.calculateActivePoints(driverLat, driverLng, restLat, restLng);
            const distance = (0, commonFunctions_1.calculateDistance)(driverLat, driverLng, restLat, restLng);
            console.log('addOrderToDriver - Calculating points and distance: END, Points:', points, 'Distance:', distance, 'Time:', Date.now() - startTime, 'ms');
            console.log('addOrderToDriver - Updating driver: START');
            driver.active_points = (driver.active_points || 0) + points;
            driver.is_on_delivery = true;
            driver.updated_at = Math.floor(Date.now() / 1000);
            await manager.save(driver_entity_1.Driver, driver);
            console.log('addOrderToDriver - Updating driver: END, Time:', Date.now() - startTime, 'ms');
            if (distance) {
                console.log('addOrderToDriver - Updating order distance: START');
                await manager
                    .createQueryBuilder()
                    .update(order_entity_1.Order)
                    .set({ distance: distance.toString() })
                    .where('id = :id', { id: orderId })
                    .execute();
                console.log('addOrderToDriver - Updating order distance: END, Time:', Date.now() - startTime, 'ms');
            }
            console.log('addOrderToDriver - Complete, Total Time:', Date.now() - startTime, 'ms');
            return (0, createResponse_1.createResponse)('OK', driver, 'Driver updated successfully');
        }
        catch (error) {
            console.error('Error in addOrderToDriver:', error);
            return this.handleError('Error updating driver:', error);
        }
    }
    calculateActivePoints(lat1, lng1, lat2, lng2) {
        const distance = (0, commonFunctions_1.calculateDistance)(lat1, lng1, lat2, lng2);
        return distance > 10000 ? 20 : 10;
    }
    handleDriverResponse(driver) {
        if (!driver) {
            return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
        }
        return (0, createResponse_1.createResponse)('OK', driver, 'Driver retrieved successfully');
    }
    async getRestaurantLocation(location) {
        if (typeof location === 'string') {
            const response = await this.addressRepository.findById(location);
            return response ? response.location : null;
        }
        return location;
    }
    calculateDriverPriorities(drivers, restaurantLocation) {
        return drivers
            .map(driver => ({
            ...driver,
            distance: (0, commonFunctions_1.calculateDistance)(driver.location.lat, driver.location.lng, restaurantLocation.lat, restaurantLocation.lng),
            active_points: driver.active_points || 0,
            current_orders: driver.current_orders || []
        }))
            .sort((a, b) => this.compareDriverPriorities(a, b));
    }
    compareDriverPriorities(a, b) {
        if (a.distance !== b.distance)
            return a.distance - b.distance;
        if (a.active_points !== b.active_points)
            return b.active_points - a.active_points;
        return (a.current_orders?.length || 0) - (b.current_orders?.length || 0);
    }
    handleError(message, error) {
        console.error(message, error);
        return (0, createResponse_1.createResponse)('ServerError', null, 'An error occurred while processing your request');
    }
    async updateVehicleImages(uploadResults, entityId) {
        try {
            const driver = await this.driversRepository.findById(entityId);
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            const updatedDriver = await this.driversRepository.updateVehicleImages(entityId, uploadResults);
            return (0, createResponse_1.createResponse)('OK', updatedDriver, 'Driver vehicle images updated successfully');
        }
        catch (error) {
            console.error('Error updating driver vehicle images:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to update vehicle images');
        }
    }
    async updateVehicle(driverId, updateVehicleDto) {
        try {
            const driver = await this.driversRepository.findById(driverId);
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            if (!driver.vehicle) {
                driver.vehicle = {
                    license_plate: '',
                    model: '',
                    color: '',
                    images: [],
                    brand: '',
                    owner: '',
                    year: 2000
                };
            }
            const updatedVehicle = {
                ...driver.vehicle,
                license_plate: updateVehicleDto.license_plate ?? driver.vehicle.license_plate,
                model: updateVehicleDto.model ?? driver.vehicle.model,
                color: updateVehicleDto.color ?? driver.vehicle.color,
                brand: updateVehicleDto.brand ?? driver.vehicle.brand,
                owner: updateVehicleDto.owner ?? driver.vehicle.owner,
                year: updateVehicleDto.year ?? driver.vehicle.year,
                images: driver.vehicle.images
            };
            console.log('check update vehicle', updatedVehicle, '----', updateVehicleDto);
            const updateData = {
                vehicle: updatedVehicle,
                updated_at: Math.floor(Date.now() / 1000)
            };
            const updatedDriver = await this.driversRepository.update(driverId, updateData);
            return (0, createResponse_1.createResponse)('OK', updatedDriver, 'Driver vehicle updated successfully');
        }
        catch (error) {
            console.error('Error updating driver vehicle:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Failed to update driver vehicle');
        }
    }
    async getAllDriverProgressStages({ driverId, limit, offset }) {
        try {
            const dps = await this.driverProgressStageRepository.getAllByDriverId(driverId, offset, limit);
            return (0, createResponse_1.createResponse)('OK', dps, 'Fetched all dps');
        }
        catch (error) {
            return this.handleError('Error fetching dps:', error);
        }
    }
    async formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    async getDriverRatingsReviews(driverId) {
        try {
            const driver = await this.driversRepository.findById(driverId);
            if (!driver) {
                return (0, createResponse_1.createResponse)('NotFound', null, 'Driver not found');
            }
            const ratingsReviews = await this.ratingsReviewsRepository.findAll({
                where: {
                    rr_recipient_driver_id: driverId,
                    recipient_type: 'driver'
                },
                relations: ['reviewer_customer', 'reviewer_restaurant', 'order']
            });
            const totalReviews = ratingsReviews.length;
            const totalFoodRating = ratingsReviews.reduce((sum, review) => sum + review.food_rating, 0);
            const totalDeliveryRating = ratingsReviews.reduce((sum, review) => sum + review.delivery_rating, 0);
            const averageFoodRating = totalReviews > 0 ? totalFoodRating / totalReviews : 0;
            const averageDeliveryRating = totalReviews > 0 ? totalDeliveryRating / totalReviews : 0;
            const response = {
                driver_id: driverId,
                total_reviews: totalReviews,
                average_food_rating: averageFoodRating,
                average_delivery_rating: averageDeliveryRating,
                reviews: ratingsReviews.map(review => ({
                    id: review.id,
                    reviewer_type: review.reviewer_type,
                    reviewer: review.reviewer_type === 'customer'
                        ? review.reviewer_customer
                        : review.reviewer_restaurant,
                    food_rating: review.food_rating,
                    delivery_rating: review.delivery_rating,
                    food_review: review.food_review,
                    delivery_review: review.delivery_review,
                    images: review.images,
                    created_at: review.created_at,
                    order_id: review.order_id
                }))
            };
            return (0, createResponse_1.createResponse)('OK', response, 'Driver ratings and reviews retrieved successfully');
        }
        catch (error) {
            console.error('Error getting driver ratings and reviews:', error);
            return (0, createResponse_1.createResponse)('ServerError', null, 'Error retrieving driver ratings and reviews');
        }
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_2.InjectRepository)(driver_entity_1.Driver)),
    __metadata("design:paramtypes", [drivers_repository_1.DriversRepository,
        typeorm_1.Repository,
        orders_repository_1.OrdersRepository,
        driver_stats_records_service_1.DriverStatsService,
        address_book_repository_1.AddressBookRepository,
        driver_progress_stages_repository_1.DriverProgressStagesRepository,
        online_sessions_service_1.OnlineSessionsService,
        typeorm_1.DataSource,
        ratings_reviews_repository_1.RatingsReviewsRepository])
], DriversService);
//# sourceMappingURL=drivers.service.js.map