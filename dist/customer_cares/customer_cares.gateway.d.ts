import { Server } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class CustomerCaresGateway {
    private eventEmitter;
    server: Server;
    constructor(eventEmitter: EventEmitter2);
    handleCustomerCareRequest(data: {
        userId: string;
        type: 'SUPPORT' | 'ORDER';
        chatRoomId: string;
    }): {
        userId: string;
        type: "SUPPORT" | "ORDER";
        chatRoomId: string;
    };
}
