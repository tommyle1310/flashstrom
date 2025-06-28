import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  WsException
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { LocationService } from './location.service';

const logger = new Logger('LocationGateway');

@Injectable()
@WebSocketGateway({
  namespace: 'location',
  cors: {
    origin: ['*', process.env.FULL_BACKEND_URL],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'],
  pingTimeout: 180000,
  pingInterval: 30000
})
export class LocationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  private server: Server;

  // Maps to track connected drivers and customers
  private driverSockets = new Map<string, Socket>();
  private customerSockets = new Map<string, Socket>();
  private activeDrivers = new Map<string, { lat: number; lng: number }>(); // Track driver locations

  constructor(
    private readonly jwtService: JwtService,
    private readonly locationService: LocationService
  ) {}

  afterInit() {
    logger.log('Location Gateway initialized');
  }

  private async validateToken(client: Socket): Promise<any> {
    try {
      const authHeader = client.handshake.headers.auth as string;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new WsException('Invalid token');
      }
      const token = authHeader.slice(7);
      if (!token) {
        throw new WsException('No token provided');
      }
      const decoded = await this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET
      });
      return decoded;
    } catch (error: any) {
      logger.error('Token validation error:', error.message);
      throw new WsException('Token validation failed');
    }
  }

  async handleConnection(client: Socket) {
    try {
      logger.log(`Client connected to location namespace: ${client.id}`);

      const userData = await this.validateToken(client);
      if (!userData) {
        logger.log(`Invalid token, disconnecting: ${client.id}`);
        client.disconnect(true);
        return;
      }

      // Store user data on socket
      client.data.user = userData;

      // Determine user type and store in appropriate map
      if (userData.logged_in_as === 'DRIVER') {
        this.driverSockets.set(userData.id, client);
        await client.join(`driver_${userData.id}`);
        logger.log(`Driver ${userData.id} connected to location tracking`);

        client.emit('driverConnected', {
          status: 'connected',
          driverId: userData.id,
          message: 'Driver successfully connected to location tracking'
        });
      } else if (userData.logged_in_as === 'CUSTOMER') {
        this.customerSockets.set(userData.id, client);
        await client.join(`customer_${userData.id}`);
        logger.log(`Customer ${userData.id} connected to location tracking`);

        client.emit('customerConnected', {
          status: 'connected',
          customerId: userData.id,
          message: 'Customer successfully connected to location tracking'
        });
      } else {
        logger.warn(`Unknown user type: ${userData.logged_in_as}`);
        client.disconnect(true);
        return;
      }

      return true;
    } catch (error: any) {
      logger.error('Connection error:', error.message);
      client.emit('connection_error', { reason: error.message });
      client.disconnect(true);
      return false;
    }
  }

  handleDisconnect(client: Socket) {
    const userData = client.data.user;
    if (userData) {
      if (userData.logged_in_as === 'DRIVER') {
        this.driverSockets.delete(userData.id);
        this.activeDrivers.delete(userData.id);
        logger.log(`Driver ${userData.id} disconnected from location tracking`);
      } else if (userData.logged_in_as === 'CUSTOMER') {
        this.customerSockets.delete(userData.id);
        logger.log(
          `Customer ${userData.id} disconnected from location tracking`
        );
      }
    }
    logger.log(`Client disconnected from location namespace: ${client.id}`);
  }

  @SubscribeMessage('updateDriverLocation')
  async handleUpdateDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      driver_location: { lng: number; lat: number };
      destination: { lng: number; lat: number };
    }
  ) {
    try {
      const userData = client.data.user;
      if (!userData) {
        throw new WsException('Unauthorized');
      }

      // Verify user is a driver
      if (userData.logged_in_as !== 'DRIVER') {
        throw new WsException('Only drivers can update location');
      }

      const driverId = userData.id;

      // Validate location data
      if (
        !data.driver_location ||
        typeof data.driver_location.lat !== 'number' ||
        typeof data.driver_location.lng !== 'number' ||
        !data.destination ||
        typeof data.destination.lat !== 'number' ||
        typeof data.destination.lng !== 'number'
      ) {
        throw new WsException('Invalid location data');
      }

      // Store driver's current location
      this.activeDrivers.set(driverId, {
        lat: data.driver_location.lat,
        lng: data.driver_location.lng
      });

      // Calculate ETA using the location service
      const eta = this.locationService.calculateDriverETA(
        data.driver_location,
        data.destination
      );

      const locationPayload = {
        driverId: driverId,
        lat: data.driver_location.lat,
        lng: data.driver_location.lng,
        eta: Math.round(eta) // ETA tính bằng phút
      };

      // Emit to ALL customers who are listening to this driver (using rooms)
      this.server
        .to(`driver_location_${driverId}`)
        .emit('driverCurrentLocation', locationPayload);

      logger.log(
        `Driver ${driverId} updated location to (${data.driver_location.lat}, ${data.driver_location.lng}) with ETA: ${Math.round(eta)} minutes`
      );

      // Acknowledge to the driver
      client.emit('locationUpdateAck', {
        success: true,
        message: 'Location updated successfully',
        eta: Math.round(eta)
      });
    } catch (error: any) {
      logger.error('Error updating driver location:', error.message);
      client.emit('locationUpdateAck', {
        success: false,
        message: error.message
      });
    }
  }

  @SubscribeMessage('getActiveDrivers')
  async handleGetActiveDrivers(@ConnectedSocket() client: Socket) {
    try {
      const userData = client.data.user;
      if (!userData) {
        throw new WsException('Unauthorized');
      }

      // Only customers can request active drivers
      if (userData.logged_in_as !== 'CUSTOMER') {
        throw new WsException('Only customers can request active drivers');
      }

      const activeDriversList = Array.from(this.activeDrivers.entries()).map(
        ([driverId, location]) => ({
          driverId,
          lat: location.lat,
          lng: location.lng,
          isOnline: this.driverSockets.has(driverId)
        })
      );

      client.emit('activeDriversList', {
        drivers: activeDriversList,
        count: activeDriversList.length,
        timestamp: new Date().toISOString()
      });

      logger.log(
        `Sent active drivers list to customer ${userData.id}: ${activeDriversList.length} drivers`
      );

      return {
        success: true,
        driversCount: activeDriversList.length
      };
    } catch (error: any) {
      logger.error('Error getting active drivers:', error.message);
      throw new WsException(error.message || 'Failed to get active drivers');
    }
  }

  @SubscribeMessage('subscribeToDriverLocation')
  async handleSubscribeToDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string }
  ) {
    try {
      const userData = client.data.user;
      if (!userData) {
        throw new WsException('Unauthorized');
      }

      // Only customers can subscribe to driver locations
      if (userData.logged_in_as !== 'CUSTOMER') {
        throw new WsException(
          'Only customers can subscribe to driver locations'
        );
      }

      if (!data.driverId) {
        throw new WsException('Driver ID is required');
      }

      // Join customer to driver-specific room for targeted updates
      await client.join(`driver_location_${data.driverId}`);

      logger.log(
        `Customer ${userData.id} subscribed to driver ${data.driverId} location updates`
      );

      // Send current driver location if available
      const currentLocation = this.activeDrivers.get(data.driverId);
      if (currentLocation) {
        client.emit('driverCurrentLocation', {
          driverId: data.driverId,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          eta: null // ETA will be calculated on next update
        });
      }

      client.emit('subscriptionAck', {
        success: true,
        driverId: data.driverId,
        message: 'Successfully subscribed to driver location updates'
      });
    } catch (error: any) {
      logger.error('Error subscribing to driver location:', error.message);
      client.emit('subscriptionAck', {
        success: false,
        message: error.message
      });
    }
  }

  @SubscribeMessage('unsubscribeFromDriverLocation')
  async handleUnsubscribeFromDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string }
  ) {
    try {
      const userData = client.data.user;
      if (!userData) {
        throw new WsException('Unauthorized');
      }

      if (!data.driverId) {
        throw new WsException('Driver ID is required');
      }

      // Leave the driver-specific room
      await client.leave(`driver_location_${data.driverId}`);

      logger.log(
        `Customer ${userData.id} unsubscribed from driver ${data.driverId} location updates`
      );

      client.emit('unsubscriptionAck', {
        success: true,
        driverId: data.driverId,
        message: 'Successfully unsubscribed from driver location updates'
      });
    } catch (error: any) {
      logger.error('Error unsubscribing from driver location:', error.message);
      client.emit('unsubscriptionAck', {
        success: false,
        message: error.message
      });
    }
  }
}
