import { Repository } from 'typeorm';
import { CartItem } from './entities/cart_item.entity';
import { CreateCartItemDto } from './dto/create-cart_item.dto';
import { UpdateCartItemDto } from './dto/update-cart_item.dto';
export declare class CartItemsRepository {
    private repository;
    constructor(repository: Repository<CartItem>);
    create(createDto: CreateCartItemDto): Promise<CartItem>;
    findAll(query?: Record<string, any>): Promise<CartItem[]>;
    findById(id: string): Promise<CartItem>;
    findByCustomerId(customerId: string): Promise<CartItem[]>;
    findOne(query: Record<string, any>): Promise<CartItem>;
    update(id: string, updateDto: UpdateCartItemDto): Promise<CartItem>;
    remove(id: string): Promise<boolean>;
}
