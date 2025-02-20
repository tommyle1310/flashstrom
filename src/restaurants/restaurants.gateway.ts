import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { DriversService } from 'src/drivers/drivers.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { forwardRef, Inject } from '@nestjs/common';
import { FIXED_DELIVERY_DRIVER_WAGE } from 'src/utils/constants';
import { Location } from 'src/types/Order';

interface AvailableDriver {
  _id: string;
  lat: number;
  lng: number;
}

interface RestaurantAcceptData {
  availableDrivers: AvailableDriver[];
  orderDetails: {
    restaurant_id: string;
    restaurant_location: Location;
    customer_location: Location;
    status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
    payment_method: 'COD' | 'FWallet';
    total_amount: number;
    customer_id: string;
    delivery_address: string;
    items: any[];
    order_items: any[];
    tracking_info: any;
    customer_note: string;
    restaurant_note: string;
    order_time: number;
  };
}

@WebSocketGateway({
  namespace: 'restaurant',
  cors: {
    origin: ['*', 'localhost:1310'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket']
})
export class RestaurantsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly restaurantsService: RestaurantsService,
    @Inject(forwardRef(() => DriversService))
    private readonly driverService: DriversService,
    private eventEmitter: EventEmitter2
  ) {}

  afterInit() {
    console.log('Restaurant Gateway initialized!');
  }

  handleConnection(client: Socket) {
    console.log('⚡️ Client connected to restaurant namespace:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('❌ Client disconnected from restaurant namespace:', client.id);
  }

  @SubscribeMessage('joinRoomRestaurant')
  handleJoinRoom(client: Socket, data: any) {
    const restaurantId =
      typeof data === 'string' ? data : data?.channel || data?._id || data;

    try {
      client.join(`restaurant_${restaurantId}`);
      console.log('✅ Successfully joined room');
      console.log(`restaurant_${restaurantId}`);

      return {
        event: 'joinRoomRestaurant',
        data: `Joined restaurant_${restaurantId}`
      };
    } catch (error) {
      console.error('❌ Error joining room:', error);
      return {
        event: 'error',
        data: 'Failed to join room'
      };
    }
  }

  @SubscribeMessage('updateRestaurant')
  async handleUpdateRestaurant(
    @MessageBody() updateRestaurantDto: UpdateRestaurantDto
  ) {
    const restaurant = await this.restaurantsService.update(
      updateRestaurantDto._id,
      updateRestaurantDto
    );
    this.server.emit('restaurantUpdated', restaurant);
    return restaurant;
  }

  @SubscribeMessage('newOrderForRestaurant')
  async handleNewOrder(@MessageBody() order: any) {
    const restaurantId = await order.restaurant_id;

    // Add this log to verify the room name matches
    console.log('Emitting to room:', `restaurant_${restaurantId}`);

    // Update the room name to match the join format
    await this.server
      .to(`restaurant_${restaurantId}`)
      .emit('incomingOrder', order);
    console.log('chck rs orer', restaurantId);

    return order;
  }

  @SubscribeMessage('restaurantAcceptWithAvailableDrivers')
  async handleRestaurantAcceptWithDrivers(
    @MessageBody() data: RestaurantAcceptData
  ) {
    const { availableDrivers, orderDetails } = data;
    // Fix the mapping to match the expected structure
    const mappedDrivers = availableDrivers.map(item => ({
      _id: item._id,
      location: {
        lat: item.lat,
        lng: item.lng
      },
      active_points: 0,
      current_order_id: []
    }));

    const responsePrioritizeDrivers =
      await this.driverService.prioritizeAndAssignDriver(
        mappedDrivers,
        orderDetails
      );
    console.log('should here first', responsePrioritizeDrivers);

    if (
      responsePrioritizeDrivers.EC === 0 &&
      responsePrioritizeDrivers.data.length > 0
    ) {
      const selectedDriver = responsePrioritizeDrivers.data[0];

      // Create the order assignment object
      const orderAssignment = {
        ...orderDetails,
        driver_id: selectedDriver._id,
        driver_wage: FIXED_DELIVERY_DRIVER_WAGE
      };
      // Emit the event for the DriversGateway to pick up
      this.eventEmitter.emit('order.assignedToDriver', orderAssignment);

      return orderAssignment;
    }

    return { error: 'No suitable driver found' };
  }

  // @SubscribeMessage('test')
  // handleTest(client: Socket) {
  //   console.log('🧪 Test event received from client:', client.id);
  //   return { event: 'test', data: 'Test successful!' };
  // }
}
