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

@WebSocketGateway()
export class RestaurantsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly restaurantsService: RestaurantsService) {}

  handleConnection(restaurant: Socket, ...args: any[]) {
    console.log(`restaurant connected: ${restaurant.id}`);
  }

  handleDisconnect(restaurant: Socket) {
    console.log(`restaurant disconnected: ${restaurant.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(restaurant: Socket, room: string) {
    restaurant.join(room);
    console.log(`restaurant joined room: ${room}`);
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
}
