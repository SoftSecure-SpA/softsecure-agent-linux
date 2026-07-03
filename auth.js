import axios from 'axios';
import logger from './logger.js';

export async function getToken() {
    const { AGENT_NAME, AGENT_KEY, BACKEND_URL, TENANT_ID } = process.env;

    if (!AGENT_NAME || !AGENT_KEY || !BACKEND_URL) {
        throw new Error('AGENT_NAME, AGENT_KEY y BACKEND_URL son requeridos en .env');
    }

    const res = await axios.post(`${BACKEND_URL}/soc-agent/auth`, {
        name: AGENT_NAME,
        agentKey: AGENT_KEY,
        tenantId: TENANT_ID || undefined,
    });

    logger.info(`✅ Token recibido para agente: ${AGENT_NAME}`);
    return res.data.token;
}
