import { AdminRole, AdminPermission, AdminStatus } from 'src/utils/types/admin';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Admin } from '../entities/admin.entity';
export declare class CreateAdminDto {
    user_id: string;
    role: AdminRole;
    permissions: AdminPermission[];
    assigned_restaurants?: Restaurant[];
    assigned_drivers?: Driver[];
    assigned_customer_care?: CustomerCare[];
    created_at?: number;
    updated_at: number;
    created_by?: Admin;
    status: AdminStatus;
}
