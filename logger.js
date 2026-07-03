import { createLogger, format, transports } from 'winston';
import fs from 'fs';
import path from 'path';

const logDir = '/var/log/softsecure';
try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
} catch {
    // Si no tenemos permisos, caemos al directorio local
}

const fileTransport = (() => {
    try {
        return new transports.File({ filename: path.join(logDir, 'soc-agent.log'), maxsize: 5242880, maxFiles: 5 });
    } catch {
        return new transports.File({ filename: 'logs/soc-agent.log', maxsize: 5242880, maxFiles: 5 });
    }
})();

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
    ),
    transports: [new transports.Console(), fileTransport],
});

export default logger;
