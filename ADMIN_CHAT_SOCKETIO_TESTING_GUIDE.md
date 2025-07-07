# 🔥 FlashFood Admin Chat Socket.IO Testing Guide

## 📋 **Overview**

Complete real-time admin chat system with Socket.IO for admins and customer care representatives to communicate internally.

## 🚀 **Key Features**

- ✅ **Real-time messaging** between admins and customer care
- ✅ **Group chats** with role-based access
- ✅ **Invitation system** (send/accept/decline)
- ✅ **Order tagging** in messages
- ✅ **User tagging** in group chats
- ✅ **Direct messaging** between any admin/customer care
- ✅ **File attachments** and rich media
- ✅ **Typing indicators**
- ✅ **Message read receipts**

---

## 🔧 **Connection Setup**

### **WebSocket Connection URL**

```
ws://localhost:1310/admin-chat
```

### **Authentication Headers**

```json
{
  "auth": "Bearer YOUR_ADMIN_JWT_TOKEN"
}
```

### **Valid User Types**

- `SUPER_ADMIN`
- `FINANCE_ADMIN`
- `COMPANION_ADMIN`
- `CUSTOMER_CARE_REPRESENTATIVE`
- `ADMIN`

---

## 🧪 **Testing Flow with Postman**

### **Step 1: Connect to Admin Chat**

**Event:** `connect`
**Listen for:** `adminConnected`

```json
// Response you'll receive
{
  "adminId": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
  "role": "SUPER_ADMIN",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📋 **1. GROUP CHAT MANAGEMENT**

### **1.1 Create Admin Group**

**Emit:** `createAdminGroup`
**Listen for:** `groupCreated`, `groupCreationError`

```json
{
  "groupName": "Finance Team Discussion",
  "groupDescription": "Internal finance team coordination",
  "groupAvatar": "https://example.com/finance-avatar.jpg",
  "initialParticipants": ["FF_ADMIN_finance1", "FF_CC_customer_care1"],
  "allowedRoles": [
    "FINANCE_ADMIN",
    "SUPER_ADMIN",
    "CUSTOMER_CARE_REPRESENTATIVE"
  ],
  "category": "finance",
  "tags": ["finance", "internal", "coordination"],
  "isPublic": false,
  "maxParticipants": 20
}
```

**Expected Response:**

```json
{
  "success": true,
  "groupId": "chat-room-uuid",
  "groupName": "Finance Team Discussion",
  "participantCount": 3,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**All Group Members Receive:**

```json
{
  "group": {
    "id": "chat-room-uuid",
    "type": "ADMIN_GROUP",
    "groupName": "Finance Team Discussion",
    "groupDescription": "Internal finance team coordination",
    "participants": [...],
    "createdBy": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
    "category": "finance",
    "tags": ["finance", "internal", "coordination"]
  },
  "createdBy": {
    "id": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
    "name": "John Admin",
    "role": "SUPER_ADMIN"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **1.2 Send Group Invitation**

**Emit:** `sendGroupInvitation`
**Listen for:** `invitationsSent`, `invitationError`

```json
{
  "groupId": "chat-room-uuid",
  "invitedUserIds": ["FF_ADMIN_finance2", "FF_CC_support1"],
  "message": "Join our finance team discussion group!",
  "expiresAt": "2024-01-22T10:30:00.000Z"
}
```

**Invited Users Receive:** `groupInvitationReceived`

```json
{
  "inviteIds": ["invite-uuid-1", "invite-uuid-2"],
  "groupId": "chat-room-uuid",
  "invitedBy": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
  "inviterName": "John Admin",
  "inviterRole": "SUPER_ADMIN",
  "message": "Join our finance team discussion group!",
  "expiresAt": "2024-01-22T10:30:00.000Z",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **1.3 Respond to Invitation**

**Emit:** `respondToInvitation`
**Listen for:** `invitationResponse`, `invitationResponseError`

```json
{
  "inviteId": "invite-uuid-1",
  "response": "ACCEPT",
  "reason": "Looking forward to collaborating!"
}
```

**Response:**

```json
{
  "success": true,
  "response": "ACCEPT",
  "groupId": "chat-room-uuid",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Group Members Receive:** `userJoinedGroup`

```json
{
  "groupId": "chat-room-uuid",
  "userId": "FF_ADMIN_finance2",
  "userName": "Jane Finance Admin",
  "userRole": "FINANCE_ADMIN",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **1.4 Get Pending Invitations**

**Emit:** `getPendingInvitations`
**Listen for:** `pendingInvitations`, `invitationsError`

**Response:**

```json
{
  "invitations": [
    {
      "inviteId": "invite-uuid",
      "groupId": "chat-room-uuid",
      "groupName": "Finance Team Discussion",
      "groupDescription": "Internal finance team coordination",
      "invitedBy": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
      "inviterName": "John Admin",
      "inviterRole": "SUPER_ADMIN",
      "invitedAt": "2024-01-15T10:30:00.000Z",
      "expiresAt": "2024-01-22T10:30:00.000Z",
      "message": "Join our finance team discussion group!",
      "participantCount": 5
    }
  ],
  "count": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 💬 **2. DIRECT MESSAGING**

### **2.1 Start Direct Chat**

**Emit:** `startDirectChat`
**Listen for:** `directChatStarted`, `directChatError`

```json
{
  "withAdminId": "FF_CC_customer_care1",
  "category": "support",
  "priority": "high",
  "initialOrderReference": {
    "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854",
    "issueDescription": "Customer complaint about delivery delay",
    "urgencyLevel": "high"
  }
}
```

**Both Users Receive:** `directChatStarted`

```json
{
  "chatId": "direct-chat-uuid",
  "withUser": "FF_CC_customer_care1",
  "withUserName": "Sarah Customer Care",
  "withUserRole": "CUSTOMER_CARE_REPRESENTATIVE",
  "category": "support",
  "priority": "high",
  "initialOrderReference": {
    "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854",
    "issueDescription": "Customer complaint about delivery delay",
    "urgencyLevel": "high"
  },
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📤 **3. MESSAGING SYSTEM**

### **3.1 Send Text Message**

**Emit:** `sendMessage`
**Listen for:** `newMessage`, `messageSent`, `messageError`

```json
{
  "roomId": "chat-room-uuid",
  "content": "Hello team! We need to discuss the Q1 budget allocations.",
  "messageType": "TEXT",
  "priority": "medium"
}
```

### **3.2 Send Message with Order Reference**

**Emit:** `sendMessage`
**Listen for:** `newMessage`, `orderReferenced`

```json
{
  "roomId": "chat-room-uuid",
  "content": "We have an urgent delivery issue that needs immediate attention!",
  "messageType": "ORDER_REFERENCE",
  "orderReference": {
    "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854",
    "orderStatus": "OUT_FOR_DELIVERY",
    "customerName": "John Customer",
    "restaurantName": "Pizza Palace",
    "totalAmount": 25.99,
    "issueDescription": "Customer reports driver never arrived",
    "urgencyLevel": "critical"
  },
  "priority": "critical"
}
```

**All Room Members Receive:** `newMessage`

```json
{
  "id": "message-uuid",
  "roomId": "chat-room-uuid",
  "senderId": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
  "senderType": "SUPER_ADMIN",
  "content": "We have an urgent delivery issue that needs immediate attention!",
  "messageType": "ORDER_REFERENCE",
  "orderReference": {
    "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854",
    "orderStatus": "OUT_FOR_DELIVERY",
    "customerName": "John Customer",
    "restaurantName": "Pizza Palace",
    "totalAmount": 25.99,
    "issueDescription": "Customer reports driver never arrived",
    "urgencyLevel": "critical"
  },
  "priority": "critical",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "senderDetails": {
    "id": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
    "name": "John Admin",
    "role": "SUPER_ADMIN"
  }
}
```

**Additionally Receive:** `orderReferenced`

```json
{
  "roomId": "chat-room-uuid",
  "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854",
  "messageId": "message-uuid",
  "urgencyLevel": "critical",
  "referencedBy": {
    "id": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
    "name": "John Admin",
    "role": "SUPER_ADMIN"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **3.3 Send Message with User Tagging**

**Emit:** `sendMessage`
**Listen for:** `newMessage`, `userTagged`

```json
{
  "roomId": "chat-room-uuid",
  "content": "@finance2 @support1 Please review this order issue and provide input on compensation.",
  "messageType": "TEXT",
  "taggedUsers": ["FF_ADMIN_finance2", "FF_CC_support1"],
  "priority": "high"
}
```

**Tagged Users Receive:** `userTagged`

```json
{
  "roomId": "chat-room-uuid",
  "messageId": "message-uuid",
  "taggedBy": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
  "taggedByName": "John Admin",
  "content": "@finance2 @support1 Please review this order issue and provide input on compensation.",
  "roomType": "ADMIN_GROUP",
  "roomName": "Finance Team Discussion",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **3.4 Send File Attachment**

**Emit:** `sendMessage`

```json
{
  "roomId": "chat-room-uuid",
  "content": "Here's the financial report for Q1",
  "messageType": "FILE",
  "fileAttachment": {
    "fileName": "Q1_Financial_Report.pdf",
    "fileSize": 2048576,
    "fileType": "application/pdf",
    "fileUrl": "https://storage.example.com/reports/q1-report.pdf",
    "thumbnailUrl": "https://storage.example.com/thumbnails/q1-report-thumb.jpg"
  },
  "priority": "medium"
}
```

---

## 🎯 **4. ROOM MANAGEMENT**

### **4.1 Get Admin Chats**

**Emit:** `getAdminChats`
**Listen for:** `adminChatsList`, `chatsListError`

```json
{
  "query": "finance",
  "category": "finance",
  "roomType": "ADMIN_GROUP",
  "limit": 20,
  "offset": 0
}
```

**Response:**

```json
{
  "chats": [
    {
      "id": "chat-room-uuid",
      "type": "ADMIN_GROUP",
      "groupName": "Finance Team Discussion",
      "groupDescription": "Internal finance team coordination",
      "participants": [...],
      "lastMessage": {
        "id": "message-uuid",
        "content": "Latest budget update",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "senderName": "John Admin"
      },
      "createdAt": "2024-01-15T09:00:00.000Z",
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "category": "finance",
      "tags": ["finance", "internal"]
    }
  ],
  "total": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **4.2 Join Room**

**Emit:** `joinRoom`
**Listen for:** `roomJoined`, `joinRoomError`

```json
{
  "roomId": "chat-room-uuid",
  "roomType": "ADMIN_GROUP"
}
```

### **4.3 Leave Room**

**Emit:** `leaveRoom`
**Listen for:** `roomLeft`, `leaveRoomError`

```json
{
  "roomId": "chat-room-uuid",
  "roomType": "ADMIN_GROUP"
}
```

---

## 🛠️ **5. GROUP MANAGEMENT**

### **5.1 Update Group Settings**

**Emit:** `updateGroupSettings`
**Listen for:** `groupSettingsUpdated`, `groupSettingsError`

```json
{
  "groupId": "chat-room-uuid",
  "groupName": "Finance & Operations Team",
  "groupDescription": "Extended team for finance and operations coordination",
  "allowedRoles": ["FINANCE_ADMIN", "SUPER_ADMIN", "COMPANION_ADMIN"],
  "tags": ["finance", "operations", "coordination"],
  "maxParticipants": 30
}
```

### **5.2 Manage Group Participant**

**Emit:** `manageGroupParticipant`
**Listen for:** `participantManaged`, `participantManageError`

```json
{
  "groupId": "chat-room-uuid",
  "participantId": "FF_ADMIN_finance2",
  "action": "PROMOTE",
  "newRole": "ADMIN",
  "reason": "Excellent contribution to team discussions"
}
```

---

## 📦 **6. ORDER INTEGRATION**

### **6.1 Get Order Details**

**Emit:** `getOrderDetails`
**Listen for:** `orderDetails`, `orderDetailsError`

```json
{
  "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854"
}
```

**Response:**

```json
{
  "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854",
  "details": {
    "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854",
    "orderStatus": "OUT_FOR_DELIVERY",
    "customerName": "John Customer",
    "restaurantName": "Pizza Palace",
    "totalAmount": 25.99
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **6.2 Get Chats by Order ID**

**Emit:** `getChatsByOrderId`
**Listen for:** `orderRelatedChats`, `orderChatsError`

```json
{
  "orderId": "FF_ORDER_000aba07-8861-4966-bc1b-56db9f9d5854"
}
```

---

## ⌨️ **7. TYPING INDICATORS**

### **7.1 Start Typing**

**Emit:** `typing`
**Listen for:** `userTyping`

```json
{
  "roomId": "chat-room-uuid",
  "roomType": "ADMIN_GROUP"
}
```

**Other Users Receive:** `userTyping`

```json
{
  "roomId": "chat-room-uuid",
  "userId": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
  "userName": "John Admin",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **7.2 Stop Typing**

**Emit:** `stopTyping`
**Listen for:** `userStoppedTyping`

```json
{
  "roomId": "chat-room-uuid",
  "roomType": "ADMIN_GROUP"
}
```

---

## ✅ **8. MESSAGE READ RECEIPTS**

### **8.1 Mark Message as Read**

**Emit:** `markMessageAsRead`
**Listen for:** `messageRead`

```json
{
  "messageId": "message-uuid",
  "roomId": "chat-room-uuid"
}
```

**Other Users Receive:** `messageRead`

```json
{
  "messageId": "message-uuid",
  "readBy": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed",
  "readByName": "John Admin",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔍 **9. UTILITY EVENTS**

### **9.1 Ping/Pong**

**Emit:** `ping`
**Listen for:** `pong`

**Response:**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "adminId": "FF_ADMIN_ea42a109-ec7a-4014-ada2-a050c9e817ed"
}
```

---

## 🧪 **Complete Testing Scenario**

### **Scenario: Finance Team Order Issue Discussion**

1. **Admin A** creates finance team group
2. **Admin A** invites **Admin B** and **Customer Care Rep**
3. **Admin B** and **Customer Care Rep** accept invitations
4. **Customer Care Rep** receives order complaint, starts direct chat with **Admin A**
5. **Admin A** brings the issue to group chat with order reference
6. **Admin A** tags **Admin B** for input
7. **Admin B** responds with suggested resolution
8. **Customer Care Rep** updates on customer contact
9. All participants see real-time updates and typing indicators

### **Testing Steps:**

1. **Connect 3 users** (Admin A, Admin B, Customer Care Rep)
2. **Follow group creation flow**
3. **Test invitation system**
4. **Exchange messages** with order references and tagging
5. **Test typing indicators**
6. **Test read receipts**
7. **Test room management features**

---

## 🚨 **Error Handling**

All events can return errors. Listen for:

- `groupCreationError`
- `invitationError`
- `messageError`
- `directChatError`
- `groupSettingsError`
- `participantManageError`
- `orderDetailsError`

**Error Format:**

```json
{
  "error": "Error message description",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔧 **Technical Notes**

- **Namespace:** `/admin-chat`
- **Authentication:** JWT token required
- **Real-time:** All events are instant via Socket.IO
- **Persistence:** Messages and rooms saved to database
- **Auto-reconnect:** Clients automatically rejoin existing rooms
- **Scalable:** Uses room-based messaging for efficiency

---

## 🎯 **Success Criteria**

✅ **Real-time messaging** between admins/customer care  
✅ **Group management** with invitations  
✅ **Order tagging** in messages  
✅ **User tagging** notifications  
✅ **File attachments** support  
✅ **Typing indicators** working  
✅ **Read receipts** functioning  
✅ **Error handling** proper  
✅ **Auto-reconnection** working  
✅ **Multi-user** scenarios tested

---

This comprehensive Socket.IO admin chat system provides all the real-time functionality you requested! 🚀
