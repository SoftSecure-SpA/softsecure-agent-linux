import chokidar from 'chokidar';
import logger from '../logger.js';

const queue = [];
const WATCHED = (process.env.INTEGRITY_PATHS || '/etc,/bin,/usr/bin')
    .split(',').map((p) => p.trim()).filter(Boolean);

let watcher = null;

export function startIntegrityMonitor() {
    watcher = chokidar.watch(WATCHED, {
        persistent: true,
        ignoreInitial: true,
        depth: 2,
        awaitWriteFinish: { stabilityThreshold: 500 },
    });

    watcher.on('change', (p) => queue.push({
        ruleId: 'FIM-001', ruleLevel: 7,
        ruleDescription: `Archivo modificado: ${p}`,
        ruleGroups: ['integrity', 'fim'], category: 'integrity', severity: 'medium',
        location: p, fullLog: `Modificación detectada en ${p}`,
        alertTimestamp: new Date().toISOString(), rawData: { event: 'change', path: p },
    }));

    watcher.on('add', (p) => queue.push({
        ruleId: 'FIM-002', ruleLevel: 6,
        ruleDescription: `Archivo nuevo creado: ${p}`,
        ruleGroups: ['integrity', 'fim'], category: 'integrity', severity: 'medium',
        location: p, fullLog: `Nuevo archivo en ${p}`,
        alertTimestamp: new Date().toISOString(), rawData: { event: 'add', path: p },
    }));

    watcher.on('unlink', (p) => queue.push({
        ruleId: 'FIM-003', ruleLevel: 8,
        ruleDescription: `Archivo eliminado: ${p}`,
        ruleGroups: ['integrity', 'fim'], category: 'integrity', severity: 'high',
        location: p, fullLog: `Archivo eliminado: ${p}`,
        alertTimestamp: new Date().toISOString(), rawData: { event: 'unlink', path: p },
    }));

    logger.info(`🔍 FIM activo en: ${WATCHED.join(', ')}`);
}

export function drainIntegrityQueue() {
    const items = [...queue];
    queue.length = 0;
    return items;
}
