# Admin Chat Internal Feature Documentation

## Overview

This README provides a comprehensive overview of the admin chat internal system implemented in the FlashFood Backend. This feature enables real-time communication for admins and customer care representatives using Socket.IO. It supports group chats, direct chats, messaging with various enhancements (e.g., order references, tagging), and room management. The implementation is based on NestJS WebSocket gateways and services, ensuring secure, authenticated interactions.

Key components:

- **Gateway**: `admin-chat.gateway.ts` - Handles WebSocket connections, events, and real-time broadcasting.
- **Service**: `admin-chat.service.ts` - Manages business logic, database interactions, and data validation.
- **Namespace**: All events are under the 'admin-chat' namespace for isolation.

This system is designed for internal use by admins (e.g., SUPER_ADMIN,COMPNAINON_ADMIN, FINANCE_ADMIN) and customer care staff, with role-based access control. The frontend can integrate with these features to build a responsive chat interface.

## Implemented Features

The following features have been fully implemented and are ready for frontend integration:

1. **Authentication and Connection**:
   - Admins must provide a JWT token (via the 'auth' header) to connect.
   - Upon successful connection, the admin is validated and joined to their personal room for notifications.
   - Events:
     - `adminConnected`: Emitted on successful connection with admin details.

2. **Group Chat Management**:
   - Create groups with custom settings (name, description, avatar, participants, roles, etc.).
   - Send and respond to group invitations.
   - Join or leave groups.
   - Update group settings (e.g., name, roles, tags).
   - Manage participants (promote, demote, remove).
   - Events:
     - `createAdminGroup`: Create a new group.
     - `sendGroupInvitation`: Invite users to a group.
     - `respondToInvitation`: Accept or decline an invitation.
     - `getPendingInvitations`: Fetch pending invites for the admin.
     - `groupCreated`: Broadcast when a group is created.
     - `userJoinedGroup`: Notify when a user joins.
     - `userLeftGroup`: Notify when a user leaves.
     - `groupSettingsUpdated`: Broadcast group updates.
     - `participantManaged`: Notify of participant changes.

3. **Direct Chat**:
   - Start one-on-one chats between admins, with optional order references and priorities.
   - Events:
     - `startDirectChat`: Initiate a direct chat.
     - `directChatStarted`: Confirm and notify the other participant.

4. **Messaging System**:
   - Send messages with various types (text, image, video, file, order reference).
   - Support for priorities, replies, tagging users, and file attachments.
   - Real-time delivery with read receipts and typing indicators.
   - Events:
     - `sendMessage`: Send a message to a room.
     - `newMessage`: Broadcast a new message.
     - `orderReferenced`: Special event for messages with order details.
     - `userTagged`: Notify tagged users.
     - `typing`: Indicate when a user is typing.
     - `stopTyping`: Indicate when typing stops.
     - `markMessageAsRead`: Mark a message as read and notify others.
     - `messageRead`: Broadcast read status.

5. **Order Integration**:
   - Link messages to orders for context (e.g., reference an order ID with details like status, customer name).
   - Fetch order details or chats related to a specific order.
   - Events:
     - `getOrderDetails`: Retrieve details for an order.
     - `getChatsByOrderId`: Get chats associated with an order.

6. **Room and Chat Retrieval**:
   - Fetch lists of chats (groups or direct) with search and filtering options.
   - Events:
     - `getAdminChats`: Retrieve and filter admin chats.

7. **Real-Time Utilities**:
   - Typing indicators for better user experience.
   - Read receipts to track message status.
   - Ping/pong for connection health checks.
   - Events:
     - `ping`: Send a ping to check connectivity.
     - `pong`: Response from the server.

## What Can Be Achieved

With this backend implementation, the frontend can:

- Build a real-time chat interface using Socket.IO client.
- Display group and direct chats with dynamic updates (e.g., new messages, user joins).
- Handle user interactions like sending messages, inviting users, and managing groups.
- Integrate order data for admin workflows (e.g., discuss issues in chat).
- Implement notifications for events like invitations or tags.
- Ensure security by validating JWT tokens on the client side before connecting.

### Example Frontend Integration

- **Connection**: Use Socket.IO to connect to `ws://localhost:1310/admin-chat` with the JWT token in the auth header.
- **Event Handling**: Listen for events like `newMessage` to update the UI in real-time.
- **Sending Events**: Emit events like `sendMessage` with the required data payload.

## Usage Notes

- **Authentication**: All events require a valid JWT token. Ensure the token includes the `logged_in_as` field with roles like `SUPER_ADMIN`.
- **Error Handling**: The gateway emits error events (e.g., `error`) for issues like unauthorized access or invalid data.
- **Testing**: Use tools like Postman with WebSocket support to test events. Refer to the provided testing guide for details.
- **Dependencies**: This feature relies on TypeORM for database interactions and JWT for authentication.

If you need to extend this feature, consider adding frontend-specific hooks or additional events as needed.

Last Updated: [Insert Date]
