import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    createOrder(createOrderDto: CreateOrderDto): Promise<import("../utils/createResponse").ApiResponse<any>>;
    tipDriver(body: {
        orderId: string;
        tipAmount: number;
    }): Promise<import("../utils/createResponse").ApiResponse<import("./entities/order.entity").Order>>;
    findAll(): Promise<import("../utils/createResponse").ApiResponse<import("./entities/order.entity").Order[]>>;
    findOne(id: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/order.entity").Order>>;
    update(id: string, updateOrderDto: UpdateOrderDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/order.entity").Order>>;
    remove(id: string): Promise<import("../utils/createResponse").ApiResponse<null>>;
}
