import { io } from 'socket.io-client';
import { getAuthToken } from './authStore.js';
import logger from './logger.js';

let socket;

export function connectSocket() {
    const { SOCKET_URL } = process.env;
    const token = getAuthToken();

    socket = io(SOCKET_URL, {
        path: '/api/socket.io',
        transports: ['websocket'],
        auth: { token: `Bearer ${token}` },
        reconnectionDelayMax: 30000,
    });

    socket.on('connect', () => logger.info(`🟢 Conectado al socket: ${socket.id}`));
    socket.on('disconnect', (reason) => logger.warn(`🔴 Socket desconectado: ${reason}`));
    socket.on('connect_error', (err) => logger.error(`❌ Error socket: ${err.message}`));

    return socket;
}

export function getSocket() { return socket; }

export function emitAlert(alert) {
    if (socket?.connected) socket.emit('soc:alert', alert);
}
