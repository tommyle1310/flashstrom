import { Order } from 'src/orders/entities/order.entity';
export declare class CreateDriverDto {
    user_id: string;
    first_name: string;
    last_name: string;
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
        color: string;
    };
    current_location: {
        lat: number;
        lng: number;
    };
    current_orders?: Order[];
    available_for_work: boolean;
    is_on_delivery: boolean;
    active_points: number;
    rating: {
        average_rating: number;
        review_count: number;
    };
    avatar?: {
        key: string;
        url: string;
    };
}
export declare class createDriverSignup extends CreateDriverDto {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone: string;
}
export declare class UpdateVehicleDto {
    license_plate?: string;
    model?: string;
    color?: string;
    year?: number;
    brand?: string;
    owner?: string;
}
