import dotenv from 'dotenv';
dotenv.config();

import logger from './logger.js';
import { getToken } from './auth.js';
import { setAuthToken } from './authStore.js';
import { connectSocket } from './socket.js';
import { startCollector } from './collector.js';
import { startIntegrityMonitor } from './collectors/integrity.js';

(async () => {
    logger.info('🚀 Iniciando Softsecure SOC Agent (Linux)...');

    try {
        const token = await getToken();
        setAuthToken(token);

        connectSocket();

        if (process.env.COLLECT_INTEGRITY !== 'false') {
            startIntegrityMonitor();
        }

        startCollector();

        logger.info('✅ Agente SOC activo y monitoreando el sistema');
    } catch (err) {
        logger.error(`❌ Fallo al iniciar: ${err?.stack || err?.message || String(err)}`);
        process.exit(1);
    }
})();

process.on('unhandledRejection', (r) => logger.error(`🔴 UnhandledRejection: ${r}`));
process.on('uncaughtException', (e) => logger.error(`🔴 UncaughtException: ${e.message}`));
