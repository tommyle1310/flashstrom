import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { DriversService } from 'src/drivers/drivers.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsResponse } from '@nestjs/websockets';
import { OrdersRepository } from 'src/orders/orders.repository';
import { JwtService } from '@nestjs/jwt';
import { FinanceRulesService } from 'src/finance_rules/finance_rules.service';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
interface AvailableDriver {
    id: string;
    lat: number;
    lng: number;
}
interface RestaurantAcceptData {
    availableDrivers: AvailableDriver[];
    orderDetails: string;
}
export declare class RestaurantsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly restaurantsService;
    private readonly driverService;
    private eventEmitter;
    private readonly ordersRepository;
    private readonly jwtService;
    private readonly driverStatsService;
    private readonly financeRulesService;
    server: Server;
    private notificationLock;
    constructor(restaurantsService: RestaurantsService, driverService: DriversService, eventEmitter: EventEmitter2, ordersRepository: OrdersRepository, jwtService: JwtService, driverStatsService: DriverStatsService, financeRulesService: FinanceRulesService);
    afterInit(): void;
    private validateToken;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleUpdateRestaurant(updateRestaurantDto: UpdateRestaurantDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/restaurant.entity").Restaurant>>;
    handleNewOrder(order: any): Promise<{
        event: string;
        data: any;
        message: string;
    }>;
    handleRestaurantAcceptWithDrivers(data: RestaurantAcceptData): Promise<WsResponse<any>>;
    private prepareDriverData;
    private isValidDriverResponse;
    private calculateOrderMetrics;
    private calculateDriverWage;
    private updateOrderStatus;
    private updateOrderWithMetrics;
    private getUpdatedOrder;
    private notifyDriverAndParties;
    handleRestaurantOrderReady(data: {
        orderId: string;
    }): Promise<{
        event: string;
        data: import("src/orders/entities/order.entity").Order;
    } | {
        event: string;
        data: {
            message: string;
        };
    }>;
    notifyPartiesOnce(order: any): Promise<void>;
    handleListenUpdateOrderTracking(order: any): Promise<{
        event: string;
        data: any;
        message: string;
    }>;
}
export {};
