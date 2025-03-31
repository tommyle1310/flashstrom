import { User } from 'src/users/entities/user.entity';
import { Admin } from 'src/admin/entities/admin.entity';
import { DriverProgressStage } from 'src/driver_progress_stages/entities/driver_progress_stage.entity';
import { Order } from 'src/orders/entities/order.entity';
export declare class Driver {
    id: string;
    user_id: string;
    user: User;
    first_name: string;
    last_name: string;
    avatar: {
        url: string;
        key: string;
    };
    contact_email: {
        title: string;
        is_default: boolean;
        email: string;
    }[];
    contact_phone: {
        title: string;
        number: string;
        is_default: boolean;
    }[];
    vehicle: {
        license_plate: string;
        model: string;
        owner: string;
        brand: string;
        year: number;
        color: string;
        images?: {
            url: string;
            key: string;
        }[];
    };
    current_location: {
        lat: number;
        lng: number;
    };
    current_orders: Order[];
    rating: {
        average_rating: number;
        review_count: number;
    };
    available_for_work: boolean;
    is_on_delivery: boolean;
    active_points: number;
    created_at: number;
    updated_at: number;
    last_login: number;
    admins: Admin[];
    progress_stages: DriverProgressStage[];
    orders: Order[];
    generateId(): void;
}
