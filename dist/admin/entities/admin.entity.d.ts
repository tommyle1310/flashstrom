import { AdminRole, AdminPermission, AdminStatus } from 'src/utils/types/admin';
import { User } from 'src/users/entities/user.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { Driver } from 'src/drivers/entities/driver.entity';
import { CustomerCare } from 'src/customer_cares/entities/customer_care.entity';
import { Penalty } from 'src/penalties/entities/penalty.entity';
export declare class Admin {
    id: string;
    user_id: User;
    role: AdminRole;
    permissions: AdminPermission[];
    assigned_restaurants: Restaurant[];
    assigned_drivers: Driver[];
    assigned_customer_care: CustomerCare[];
    penalties_issued: Penalty[];
    last_active: number;
    created_at: number;
    updated_at: number;
    created_by: Admin;
    status: AdminStatus;
}
