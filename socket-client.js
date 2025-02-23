import { io } from 'socket.io-client';

// Connect to the namespaced endpoint
const socket = io('http://localhost:3000/restaurant');

// Listen for connection
socket.on('connect', () => {
  console.log('Connected to restaurant namespace!', socket.id);

  // Emit joinRoomRestaurant event with restaurantId "12345"
  socket.emit('joinRoomRestaurant', '12345');
});

// Listen for the response from the server
socket.on('joinRoomRestaurant', data => {
  console.log('Response from server:', data);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
});
