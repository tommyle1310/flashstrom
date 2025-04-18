import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateVehicleDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { OnlineSessionsService } from 'src/online-sessions/online-sessions.service';
export declare class DriversController {
    private readonly driversService;
    private readonly onlineSessionsService;
    constructor(driversService: DriversService, onlineSessionsService: OnlineSessionsService);
    create(createDriverDto: CreateDriverDto): Promise<import("src/utils/createResponse").ApiResponse<import("./entities/driver.entity").Driver>>;
    findAll(): Promise<import("src/utils/createResponse").ApiResponse<import("./entities/driver.entity").Driver[]>>;
    findOnlineSessionByDriverId(driverId: string, limit?: string, offset?: string): Promise<import("src/utils/createResponse").ApiResponse<{
        date: any;
        items: any;
        total_milisec: any;
        total_hours: Promise<string>;
    }[]>>;
    findAllDpsByDriverId(driverId: string, limit?: string, offset?: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    findDriverById(id: string): Promise<import("src/utils/createResponse").ApiResponse<import("./entities/driver.entity").Driver>>;
    getDriverRatingsReviews(id: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    findOne(field: string, value: string): Promise<import("src/utils/createResponse").ApiResponse<import("./entities/driver.entity").Driver>>;
    updateDriverVehicle(updateVehicleDto: UpdateVehicleDto, driverId: string): Promise<import("src/utils/createResponse").ApiResponse<import("./entities/driver.entity").Driver>>;
    update(id: string, updateDriverDto: UpdateDriverDto): Promise<import("src/utils/createResponse").ApiResponse<import("./entities/driver.entity").Driver>>;
    setAvailability(id: string): Promise<import("src/utils/createResponse").ApiResponse<import("./entities/driver.entity").Driver>>;
    remove(id: string): Promise<import("src/utils/createResponse").ApiResponse<null>>;
}
