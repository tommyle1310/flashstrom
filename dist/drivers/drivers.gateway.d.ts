import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { DriversService } from './drivers.service';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { OrdersService } from 'src/orders/orders.service';
import { DriverProgressStagesService } from 'src/driver_progress_stages/driver_progress_stages.service';
import { Order } from 'src/orders/entities/order.entity';
import { DataSource } from 'typeorm';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { Driver } from './entities/driver.entity';
import { AddressBookRepository } from 'src/address_book/address_book.repository';
import { DriversRepository } from './drivers.repository';
import { JwtService } from '@nestjs/jwt';
import { DriverStatsService } from 'src/driver_stats_records/driver_stats_records.service';
import { FinanceRulesService } from 'src/finance_rules/finance_rules.service';
import { FWalletsRepository } from 'src/fwallets/fwallets.repository';
import { TransactionService } from 'src/transactions/transactions.service';
export declare class DriversGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly restaurantsService;
    private readonly driverService;
    private readonly driverRepository;
    private readonly driverStatsService;
    private eventEmitter;
    private readonly ordersService;
    private readonly financeRulesService;
    private readonly fWalletsRepository;
    private readonly transactionsService;
    private readonly driverProgressStageService;
    private readonly dataSource;
    private readonly addressBookRepository;
    private readonly jwtService;
    server: Server;
    private driverSockets;
    private notificationLock;
    private activeConnections;
    private dpsCreationLocks;
    private requestQueue;
    private processingOrders;
    constructor(restaurantsService: RestaurantsService, driverService: DriversService, driverRepository: DriversRepository, driverStatsService: DriverStatsService, eventEmitter: EventEmitter2, ordersService: OrdersService, financeRulesService: FinanceRulesService, fWalletsRepository: FWalletsRepository, transactionsService: TransactionService, driverProgressStageService: DriverProgressStagesService, dataSource: DataSource, addressBookRepository: AddressBookRepository, jwtService: JwtService);
    afterInit(): void;
    private validateToken;
    handleConnection(client: Socket): Promise<void>;
    private cleanupDriverConnections;
    handleDisconnect(client: Socket): void;
    handleUpdateDriver(updateDriverDto: UpdateDriverDto): Promise<import("../utils/createResponse").ApiResponse<Driver>>;
    handleNewOrder(order: any): Promise<any>;
    handleDriverAcceptOrder(data: {
        driverId: string;
        orderId: string;
    }): Promise<{
        success: boolean;
        order: Order;
        dps: DriverProgressStage;
    } | {
        success: boolean;
        message: any;
    }>;
    private calculateEstimatedTime;
    private calculateTotalEarns;
    private getStageDetails;
    handleDriverProgressUpdate(data: {
        stageId: string;
        orderId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        stage?: undefined;
    } | {
        success: boolean;
        stage: DriverProgressStage;
        message?: undefined;
    }>;
    notifyPartiesOnce(order: Order): Promise<void>;
    handleOrderAssignedToDriver(orderAssignment: any): Promise<{
        event: string;
        data: {
            success: boolean;
        };
    }>;
}
