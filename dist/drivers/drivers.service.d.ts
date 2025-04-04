import { CreateDriverDto, UpdateVehicleDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './entities/driver.entity';
import { ApiResponse } from 'src/utils/createResponse';
import { Type_Delivery_Order } from 'src/types/Driver';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { DriversRepository } from './drivers.repository';
import { Order } from 'src/orders/entities/order.entity';
import { OrdersRepository } from 'src/orders/orders.repository';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DriverProgressStagesRepository } from 'src/driver_progress_stages/driver_progress_stages.repository';
import { OnlineSessionsService } from 'src/online-sessions/online-sessions.service';
export declare class DriversService {
    private readonly driversRepository;
    private driverEntityRepository;
    private readonly ordersRepository;
    private readonly addressRepository;
    private readonly driverProgressStageRepository;
    private readonly onlineSessionsService;
    private readonly dataSource;
    constructor(driversRepository: DriversRepository, driverEntityRepository: Repository<Driver>, ordersRepository: OrdersRepository, addressRepository: AddressBookRepository, driverProgressStageRepository: DriverProgressStagesRepository, onlineSessionsService: OnlineSessionsService, dataSource: DataSource);
    setAvailability(id: string): Promise<ApiResponse<Driver>>;
    create(createDriverDto: CreateDriverDto): Promise<ApiResponse<Driver>>;
    findAll(): Promise<ApiResponse<Driver[]>>;
    findDriverById(id: string, options?: {
        relations?: string[];
    }): Promise<ApiResponse<Driver>>;
    findOne(conditions: object): Promise<ApiResponse<Driver>>;
    update(id: string, updateDriverDto: UpdateDriverDto): Promise<ApiResponse<Driver>>;
    remove(id: string): Promise<ApiResponse<null>>;
    updateEntityAvatar(uploadResult: {
        url: string;
        public_id: string;
    }, entityId: string): Promise<ApiResponse<Driver>>;
    prioritizeAndAssignDriver(listAvailableDrivers: Array<{
        id: string;
        location: {
            lng: number;
            lat: number;
        };
        active_points?: number;
        current_order_id?: string[];
    }>, orderDetails: Type_Delivery_Order): Promise<ApiResponse<any>>;
    updateDriverDeliveryStatus(driverId: string, orderId: Order['id'], status: boolean): Promise<ApiResponse<Driver>>;
    updateDriverOrder(driverId: string, orderIds: string[]): Promise<void>;
    addOrderToDriver(driverId: string, orderId: string, restaurantLocation: {
        lat: number;
        lng: number;
    }, transactionalEntityManager?: EntityManager): Promise<ApiResponse<Driver>>;
    private calculateActivePoints;
    private handleDriverResponse;
    private getRestaurantLocation;
    private calculateDriverPriorities;
    private compareDriverPriorities;
    private handleError;
    updateVehicleImages(uploadResults: Array<{
        key: string;
        url: string;
    }>, entityId: string): Promise<ApiResponse<any>>;
    updateVehicle(driverId: string, updateVehicleDto: UpdateVehicleDto): Promise<ApiResponse<Driver>>;
    getAllDriverProgressStages({ driverId, limit, offset }: {
        driverId: string;
        limit?: number;
        offset?: number;
    }): Promise<ApiResponse<any>>;
    formatTime(milliseconds: any): Promise<string>;
}
