import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiResponse } from '../types/api-response.type';
import { OrderCancellationReason } from './entities/order.entity';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(createOrderDto: CreateOrderDto): Promise<any>;
    tipDriver(body: {
        orderId: string;
        tipAmount: number;
    }): Promise<import("../utils/createResponse").ApiResponse<import("./entities/order.entity").Order>>;
    findAll(): Promise<Promise<any>>;
    findOne(id: string): Promise<any>;
    update(id: string, updateOrderDto: UpdateOrderDto): Promise<any>;
    remove(id: string): Promise<ApiResponse<void>>;
    cancelOrder(id: string, cancelOrderDto: {
        cancelled_by: 'customer' | 'restaurant' | 'driver';
        cancelled_by_id: string;
        reason: OrderCancellationReason;
        title: string;
        description: string;
    }): Promise<any>;
}
