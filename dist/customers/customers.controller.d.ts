import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto, UpdateCustomerFavoriteRestaurantDto, UpdateCustomerPreferredCategoryDto } from './dto/update-customer.dto';
import { CartItemsService } from 'src/cart_items/cart_items.service';
import { CreateCartItemDto } from 'src/cart_items/dto/create-cart_item.dto';
import { UpdateCartItemDto } from 'src/cart_items/dto/update-cart_item.dto';
import { AddressBookService } from 'src/address_book/address_book.service';
import { CreateAddressBookDto } from 'src/address_book/dto/create-address_book.dto';
export declare class CustomersController {
    private readonly customersService;
    private readonly cartItemService;
    private readonly addressBookService;
    constructor(customersService: CustomersService, cartItemService: CartItemsService, addressBookService: AddressBookService);
    create(createCustomerDto: CreateCustomerDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/customer.entity").Customer>>;
    findAll(): Promise<import("../utils/createResponse").ApiResponse<import("./entities/customer.entity").Customer[]>>;
    getAllRestaurants(id: string): Promise<any>;
    searchRestaurants(keyword: string, page?: number, limit?: number): Promise<import("../utils/createResponse").ApiResponse<import("../restaurants/entities/restaurant.entity").Restaurant[]>> | {
        status: string;
        data: any;
        message: string;
    };
    getAllOrders(id: string): Promise<any>;
    findAllCartItemByCustomerId(customerId: string): Promise<any>;
    findCustomerById(id: string): Promise<import("../utils/createResponse").ApiResponse<any>>;
    findOne(field: string, value: string): Promise<import("../utils/createResponse").ApiResponse<import("./entities/customer.entity").Customer>>;
    toggleFavoriteRestaurant(id: string, dto: UpdateCustomerFavoriteRestaurantDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/customer.entity").Customer>>;
    togglePreferredCategory(id: string, preferred_category: UpdateCustomerPreferredCategoryDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/customer.entity").Customer>>;
    updateCartItem(customer_id: string, cart_item_id: string, cart_item: UpdateCartItemDto): Promise<any>;
    addAddress(customerId: string, createAddressBookDto: CreateAddressBookDto): Promise<import("../utils/createResponse").ApiResponse<import("../address_book/entities/address_book.entity").AddressBook>>;
    createCartItem(customerId: string, createCartItemDto: CreateCartItemDto): Promise<any>;
    deleteCartItem(cartItemId: string): Promise<any>;
    updateAddress(customerId: string, addressbookId: string): Promise<import("../utils/createResponse").ApiResponse<any>>;
    update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<import("../utils/createResponse").ApiResponse<import("./entities/customer.entity").Customer>>;
    remove(id: string): Promise<import("../utils/createResponse").ApiResponse<null>>;
}
