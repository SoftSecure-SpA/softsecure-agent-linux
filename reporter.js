import axios from 'axios';
import logger from './logger.js';
import { getAuthToken } from './authStore.js';

export async function reportAlert(alert) {
    const token = getAuthToken();
    if (!token) { logger.warn('⚠️ Sin token — alerta descartada'); return; }

    try {
        await axios.post(`${process.env.BACKEND_URL}/soc-agent/agent/report`, alert, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
        });
        logger.info(`📤 Alerta reportada: [${alert.severity}] ${alert.ruleDescription}`);
    } catch (err) {
        logger.error(`❌ No se pudo reportar alerta: ${err.message}`);
    }
}
