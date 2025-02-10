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

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string) {
    client.join(room);
    console.log(`Client joined room: ${room}`);
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

  @SubscribeMessage('newOrder')
  async handleNewOrder(@MessageBody() order: any) {
    console.log('Received new order:', order);
    const restaurantId = order.restaurant_id;
    console.log('Restaurant ID:', restaurantId);

    // Notify the restaurant about the new order
    this.server.to(restaurantId).emit('incomingOrder', order);
    console.log(
      'Emitted incomingOrder event to restaurant:',
      restaurantId,
      order,
    );

    return order;
  }
}
