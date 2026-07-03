import logger from './logger.js';
import { reportAlert } from './reporter.js';
import { collectAuthEvents } from './collectors/auth.js';
import { collectProcessEvents } from './collectors/processes.js';
import { collectNetworkEvents } from './collectors/network.js';
import { drainIntegrityQueue } from './collectors/integrity.js';

const INTERVAL_MS = Number(process.env.COLLECT_INTERVAL || 60) * 1000;

async function runCollection() {
    logger.info('🔄 Ciclo de recolección SOC iniciado...');

    const tasks = [];
    if (process.env.COLLECT_AUTH !== 'false')      tasks.push(collectAuthEvents());
    if (process.env.COLLECT_PROCESSES !== 'false') tasks.push(collectProcessEvents());
    if (process.env.COLLECT_NETWORK !== 'false')   tasks.push(collectNetworkEvents());

    const results = await Promise.allSettled(tasks);
    const fim = process.env.COLLECT_INTEGRITY !== 'false' ? drainIntegrityQueue() : [];

    const alerts = [
        ...fim,
        ...results.flatMap((r) => r.status === 'fulfilled' ? r.value : []),
    ];

    if (alerts.length > 0) {
        logger.info(`🚨 ${alerts.length} alertas en este ciclo`);
        for (const alert of alerts) await reportAlert(alert);
    } else {
        logger.info('✅ Sin alertas en este ciclo');
    }
}

export function startCollector() {
    runCollection().catch((err) => logger.error(`❌ Error en colector: ${err.message}`));
    setInterval(() => {
        runCollection().catch((err) => logger.error(`❌ Error en colector: ${err.message}`));
    }, INTERVAL_MS);
    logger.info(`⏱️ Colector iniciado. Intervalo: ${INTERVAL_MS / 1000}s`);
}
