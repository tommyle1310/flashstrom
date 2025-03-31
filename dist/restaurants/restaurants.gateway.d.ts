import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { DriversService } from 'src/drivers/drivers.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WsResponse } from '@nestjs/websockets';
import { OrdersRepository } from 'src/orders/orders.repository';
import { JwtService } from '@nestjs/jwt';
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
    server: Server;
    private notificationLock;
    constructor(restaurantsService: RestaurantsService, driverService: DriversService, eventEmitter: EventEmitter2, ordersRepository: OrdersRepository, jwtService: JwtService);
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
