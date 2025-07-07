# FlashFood Admin Chat System - Testing Guide

## Overview

This guide provides comprehensive testing instructions for the FlashFood Admin Chat System, including WebSocket connections, REST APIs, and all admin chat functionality.

## Prerequisites

- FlashFood backend server running on `http://localhost:1310`
- Postman installed
- Admin user accounts created in the database
- WebSocket testing tools (Postman supports WebSocket testing)

## Test Data Setup

### Admin Users Required

Create these admin users in your database:

```sql
-- Super Admin
INSERT INTO admins (id, email, password, role, first_name, last_name)
VALUES ('super-admin-id', 'superadmin@flashfood.com', 'hashed_password', 'SUPER_ADMIN', 'Super', 'Admin');

-- Finance Admin
INSERT INTO admins (id, email, password, role, first_name, last_name)
VALUES ('finance-admin-id', 'finance@flashfood.com', 'hashed_password', 'FINANCE_ADMIN', 'Finance', 'Admin');

-- Companion Admin
INSERT INTO admins (id, email, password, role, first_name, last_name)
VALUES ('companion-admin-id', 'companion@flashfood.com', 'hashed_password', 'COMPANION_ADMIN', 'Companion', 'Admin');

-- Customer Care Representative
INSERT INTO admins (id, email, password, role, first_name, last_name)
VALUES ('customer-care-id', 'customercare@flashfood.com', 'hashed_password', 'CUSTOMER_CARE_REPRESENTATIVE', 'Customer', 'Care');
```

### Test Order Data

```sql
INSERT INTO orders (id, customer_id, restaurant_id, status, total_amount, created_at)
VALUES ('ORDER_123456', 'customer-id', 'restaurant-id', 'DELIVERED', 25.99, NOW());
```

## Testing Flow

### 1. Authentication Testing

**Objective**: Verify admin login and token generation

**Steps**:

1. Run "Login - Super Admin" request
2. Verify response contains valid JWT token
3. Repeat for other admin types
4. Check that tokens are automatically saved to collection variables

**Expected Results**:

- Status: 200 OK
- Response contains `data.token`
- Token is saved to collection variable

### 2. WebSocket Connection Testing

**Objective**: Test real-time WebSocket connections

**Steps**:

1. Use Postman's WebSocket feature to connect to `ws://localhost:1310/chat`
2. Send authentication header: `Authorization: Bearer {{adminToken}}`
3. Test connection establishment
4. Verify welcome message reception

**Expected Results**:

- Connection established successfully
- Welcome message received
- User appears as online

### 3. Admin Group Management Testing

#### 3.1 Create Admin Group

**Objective**: Test group creation functionality

**Steps**:

1. Run "Create Admin Group - Super Admin" request
2. Verify group creation with proper permissions
3. Check that group ID is saved to collection variable

**Expected Results**:

- Status: 201 Created
- Response contains group details
- Group ID saved to `{{groupId}}` variable

#### 3.2 Group Settings Management

**Objective**: Test group settings updates

**Steps**:

1. Run "Update Group Settings" request
2. Verify settings are updated correctly
3. Check group details reflect changes

**Expected Results**:

- Status: 200 OK
- Group settings updated
- Changes reflected in subsequent requests

### 4. Invitation System Testing

#### 4.1 Send Group Invitation

**Objective**: Test invitation sending functionality

**Steps**:

1. Run "Send Group Invitation" request
2. Verify invitation is created
3. Check invitation ID is saved

**Expected Results**:

- Status: 201 Created
- Invitation details returned
- Invitation ID saved to `{{inviteId}}` variable

#### 4.2 Respond to Invitation

**Objective**: Test invitation acceptance/decline

**Steps**:

1. Run "Respond to Invitation - Accept" request
2. Verify user joins group
3. Test decline functionality

**Expected Results**:

- Status: 200 OK
- User successfully joins group (accept)
- User remains outside group (decline)

### 5. Direct Admin Chat Testing

#### 5.1 Start Direct Chat

**Objective**: Test direct messaging between admins

**Steps**:

1. Run "Start Direct Admin Chat" request
2. Verify direct chat room creation
3. Check chat ID is saved

**Expected Results**:

- Status: 201 Created
- Direct chat room created
- Chat ID saved to `{{directChatId}}` variable

### 6. Messaging Testing

#### 6.1 Send Text Message

**Objective**: Test basic text messaging

**Steps**:

1. Run "Send Text Message" request
2. Verify message is saved
3. Check message ID is captured

**Expected Results**:

- Status: 201 Created
- Message saved successfully
- Message ID saved to `{{messageId}}` variable

#### 6.2 Send Order Reference Message

**Objective**: Test order referencing functionality

**Steps**:

1. Run "Send Message with Order Reference" request
2. Verify order details are included
3. Check urgency level handling

**Expected Results**:

- Status: 201 Created
- Order reference included
- Urgency level properly set

#### 6.3 Reply to Message

**Objective**: Test message reply functionality

**Steps**:

1. Run "Reply to Message" request
2. Verify reply is linked to original message
3. Check thread structure

**Expected Results**:

- Status: 201 Created
- Reply linked to original message
- Thread structure maintained

### 7. Search and Analytics Testing

#### 7.1 Search Admin Chats

**Objective**: Test chat search functionality

**Steps**:

1. Run "Search Admin Chats" request
2. Verify search filters work
3. Check pagination

**Expected Results**:

- Status: 200 OK
- Filtered results returned
- Pagination working correctly

#### 7.2 Get Chats by Order ID

**Objective**: Test order-based chat retrieval

**Steps**:

1. Run "Get Chats by Order ID" request
2. Verify chats referencing specific order
3. Check order details included

**Expected Results**:

- Status: 200 OK
- Chats containing order reference returned
- Order details included

### 8. Admin Chatbot Testing

#### 8.1 Send Message to Chatbot

**Objective**: Test admin chatbot functionality

**Steps**:

1. Run "Send Message to Admin Chatbot" request
2. Verify chatbot responds appropriately
3. Test different command types

**Expected Results**:

- Status: 200 OK
- Chatbot responds with relevant information
- Command processing works correctly

#### 8.2 Get Chatbot Help

**Objective**: Test help system

**Steps**:

1. Run "Get Chatbot Help" request
2. Verify help menu is returned
3. Check command descriptions

**Expected Results**:

- Status: 200 OK
- Help menu with commands returned
- Clear command descriptions

### 9. Group Management Testing

#### 9.1 Add Participant

**Objective**: Test participant management

**Steps**:

1. Run "Add Participant to Group" request
2. Verify user joins group
3. Check role assignment

**Expected Results**:

- Status: 201 Created
- User successfully added to group
- Role properly assigned

#### 9.2 Promote Participant

**Objective**: Test role management

**Steps**:

1. Run "Promote Participant to Admin" request
2. Verify role change
3. Check permissions update

**Expected Results**:

- Status: 200 OK
- Role successfully changed
- Permissions updated

### 10. WebSocket Real-time Testing

#### 10.1 Real-time Message Broadcasting

**Objective**: Test real-time message delivery

**Steps**:

1. Connect multiple WebSocket clients
2. Send message from one client
3. Verify message received by all clients in room

**Expected Results**:

- Message sent successfully
- All clients in room receive message
- Real-time delivery working

#### 10.2 Order Reference Notifications

**Objective**: Test order reference notifications

**Steps**:

1. Send message with order reference
2. Verify special notification sent
3. Check urgency level handling

**Expected Results**:

- Order reference notification sent
- Urgency level properly handled
- Special formatting applied

## Error Testing

### 1. Authentication Errors

- Test with invalid token
- Test with expired token
- Test with non-admin user

### 2. Permission Errors

- Test group creation with insufficient permissions
- Test message sending to unauthorized room
- Test admin operations with wrong role

### 3. Validation Errors

- Test with missing required fields
- Test with invalid data formats
- Test with out-of-range values

## Performance Testing

### 1. Load Testing

- Send 100+ messages rapidly
- Test with multiple concurrent users
- Monitor response times

### 2. Memory Testing

- Test with large message content
- Test with many participants
- Monitor memory usage

## Security Testing

### 1. Authorization Testing

- Verify admin-only access
- Test role-based permissions
- Check data isolation

### 2. Input Validation

- Test SQL injection attempts
- Test XSS attempts
- Test malformed JSON

## Monitoring and Debugging

### 1. Log Monitoring

- Check server logs for errors
- Monitor WebSocket connections
- Track message delivery

### 2. Database Monitoring

- Monitor query performance
- Check for data consistency
- Verify transaction handling

## Common Issues and Solutions

### 1. WebSocket Connection Issues

**Problem**: Cannot connect to WebSocket
**Solution**:

- Verify server is running
- Check CORS settings
- Ensure proper authentication

### 2. Token Issues

**Problem**: Authentication failures
**Solution**:

- Check token expiration
- Verify token format
- Ensure proper admin role

### 3. Message Delivery Issues

**Problem**: Messages not received
**Solution**:

- Check room membership
- Verify WebSocket connection
- Check message format

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Clean up test groups
DELETE FROM chat_rooms WHERE group_name LIKE '%Test%';

-- Clean up test messages
DELETE FROM messages WHERE content LIKE '%test%';

-- Clean up test invitations
DELETE FROM chat_rooms WHERE type = 'ADMIN_GROUP' AND created_at > NOW() - INTERVAL 1 HOUR;
```

## Success Criteria

A successful test run should demonstrate:

1. ✅ All authentication flows work correctly
2. ✅ WebSocket connections establish and maintain
3. ✅ Group creation and management functions properly
4. ✅ Invitation system works end-to-end
5. ✅ Direct messaging between admins functions
6. ✅ Order referencing works correctly
7. ✅ Real-time message delivery functions
8. ✅ Search and analytics return accurate results
9. ✅ Admin chatbot responds appropriately
10. ✅ Error handling works correctly
11. ✅ Performance meets requirements
12. ✅ Security measures are effective

## Next Steps

After completing these tests:

1. Document any issues found
2. Create bug reports for failed tests
3. Verify fixes in subsequent test runs
4. Update test cases based on findings
5. Prepare for production deployment

---

**Note**: This testing guide should be updated as new features are added or existing functionality is modified.
