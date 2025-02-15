import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { DriversService } from 'src/drivers/drivers.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({ namespace: 'restaurant' })
export class RestaurantsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly restaurantsService: RestaurantsService,
    @Inject(forwardRef(() => DriversService))
    private readonly driverService: DriversService,
    private eventEmitter: EventEmitter2,
  ) {}

  handleConnection(restaurant: Socket, ...args: any[]) {
    console.log(`restaurant connected: ${restaurant.id}`);
  }

  handleDisconnect(restaurant: Socket) {
    console.log(`restaurant disconnected: ${restaurant.id}`);
  }

  @SubscribeMessage('joinRoomRestaurant')
  handleJoinRoom(restaurant: Socket, restaurantId: string) {
    restaurant.join(restaurantId);
    console.log(`Restaurant joined room: ${restaurantId}`);
  }

  @SubscribeMessage('updateRestaurant')
  async handleUpdateRestaurant(
    @MessageBody() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    const restaurant = await this.restaurantsService.update(
      updateRestaurantDto._id,
      updateRestaurantDto,
    );
    this.server.emit('restaurantUpdated', restaurant);
    return restaurant;
  }

  @SubscribeMessage('newOrderForRestaurant')
  async handleNewOrder(@MessageBody() order: any) {
    const restaurantId = await order.restaurant_id;

    // Notify the restaurant about the new order
    await this.server.to(restaurantId).emit('incomingOrder', order);

    return order;
  }

  @SubscribeMessage('restaurantAcceptWithAvailableDrivers')
  async handleRestaurantAcceptWithDrivers(@MessageBody() data: any) {
    const { availableDrivers, orderDetails } = data;

    // Forward to driver service for processing
    const responsePrioritizeDrivers =
      await this.driverService.prioritizeAndAssignDriver(
        availableDrivers.map((item) => ({
          _id: item._id,
          location: { lat: item.lat, lng: item.lng },
        })),
        orderDetails,
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
      };

      console.log(
        'chek  restaurantAcceptWithAvailableDrivers before order.assignedToDriver',
        orderAssignment,
      );

      // Emit the event for the DriversGateway to pick up
      this.eventEmitter.emit('order.assignedToDriver', orderAssignment);

      return orderAssignment;
    }

    return { error: 'No suitable driver found' };
  }
}
