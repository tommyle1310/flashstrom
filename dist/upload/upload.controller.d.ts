import { UploadService } from './upload.service';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { DriversService } from 'src/drivers/drivers.service';
import { CustomersService } from 'src/customers/customers.service';
import { Enum_AvatarType } from 'src/types/Payload';
import { MenuItemsService } from 'src/menu_items/menu_items.service';
export declare class UploadController {
    private readonly restaurantService;
    private readonly uploadService;
    private readonly driverService;
    private readonly customerService;
    private readonly menuItemService;
    constructor(restaurantService: RestaurantsService, uploadService: UploadService, driverService: DriversService, customerService: CustomersService, menuItemService: MenuItemsService);
    uploadAvatar(file: Express.Multer.File, userType: Enum_AvatarType, entityId: string): Promise<import("src/utils/createResponse").ApiResponse<any>>;
    uploadGalleries(files: Express.Multer.File[], userType: Enum_AvatarType, entityId: string): Promise<any>;
    uploadImage(file: Express.Multer.File): Promise<import("src/utils/createResponse").ApiResponse<any>>;
}
