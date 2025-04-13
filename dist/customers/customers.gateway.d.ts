import { Server, Socket } from 'socket.io';
import { CustomersService } from './customers.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
export declare class CustomersGateway {
    private readonly customersService;
    private readonly jwtService;
    private eventEmitter;
    server: Server;
    constructor(customersService: CustomersService, jwtService: JwtService, eventEmitter: EventEmitter2);
    private validateToken;
    handleConnection(client: Socket): Promise<void>;
    handleCustomerPlaceOrder(order: any): Promise<{
        event: string;
        data: {
            orderId: any;
            status: any;
            tracking_info: any;
            updated_at: any;
            customer_id: any;
            driver_id: any;
            restaurant_id: any;
            restaurantAddress: any;
            customerAddress: any;
        };
        message: string;
    }>;
    handleListenUpdateOrderTracking(order: any): Promise<{
        event: string;
        data: any;
        message: string;
    }>;
}
