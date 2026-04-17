import { io } from "socket.io-client";

export const socket = io(process.env.REACT_APP_API_URL || "http://localhost:4000", {
  withCredentials: true,
});

socket.on('connect',    () => console.log('Socket connected:', socket.id));
socket.on('disconnect', () => console.log('Socket disconnected'));
socket.on('connect_error', (err) => console.error('Socket connection error:', err));