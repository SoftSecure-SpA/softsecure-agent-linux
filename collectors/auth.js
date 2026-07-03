import fs from 'fs';
import readline from 'readline';
import logger from '../logger.js';

const AUTH_LOG_PATHS = ['/var/log/auth.log', '/var/log/secure', '/var/log/syslog'];
const state = { lastSize: 0, logPath: null };

function findLogPath() {
    for (const p of AUTH_LOG_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function parseLine(line) {
    const ts = new Date().toISOString();

    if (/Failed password/i.test(line)) {
        const m = line.match(/Failed password for(?: invalid user)? (\S+) from (\S+)/);
        return {
            ruleId: 'AUTH-001', ruleLevel: 8,
            ruleDescription: `Intento SSH fallido${m ? ` — usuario: ${m[1]}, desde: ${m[2]}` : ''}`,
            ruleGroups: ['authentication', 'ssh'], category: 'authentication', severity: 'high',
            location: state.logPath, fullLog: line.trim(), alertTimestamp: ts,
        };
    }
    if (/authentication failure/i.test(line)) {
        return {
            ruleId: 'AUTH-002', ruleLevel: 5,
            ruleDescription: 'Falla de autenticación local',
            ruleGroups: ['authentication'], category: 'authentication', severity: 'medium',
            location: state.logPath, fullLog: line.trim(), alertTimestamp: ts,
        };
    }
    if (/sudo:/i.test(line) && /COMMAND/i.test(line)) {
        return {
            ruleId: 'AUTH-003', ruleLevel: 4,
            ruleDescription: `Uso de sudo: ${line.slice(-120).trim()}`,
            ruleGroups: ['authentication', 'sudo'], category: 'authentication', severity: 'low',
            location: state.logPath, fullLog: line.trim(), alertTimestamp: ts,
        };
    }
    if (/FAILED su/i.test(line)) {
        return {
            ruleId: 'AUTH-004', ruleLevel: 7,
            ruleDescription: 'Intento fallido de cambio de usuario (su)',
            ruleGroups: ['authentication', 'su'], category: 'authentication', severity: 'high',
            location: state.logPath, fullLog: line.trim(), alertTimestamp: ts,
        };
    }
    if (/Accepted (password|publickey)/i.test(line)) {
        const m = line.match(/Accepted \S+ for (\S+) from (\S+)/);
        return {
            ruleId: 'AUTH-005', ruleLevel: 2,
            ruleDescription: `Login SSH exitoso${m ? ` — usuario: ${m[1]}, desde: ${m[2]}` : ''}`,
            ruleGroups: ['authentication', 'ssh'], category: 'authentication', severity: 'low',
            location: state.logPath, fullLog: line.trim(), alertTimestamp: ts,
        };
    }
    return null;
}

export async function collectAuthEvents() {
    if (!state.logPath) state.logPath = findLogPath();
    if (!state.logPath) {
        logger.warn('⚠️ No se encontró log de autenticación (/var/log/auth.log, /var/log/secure)');
        return [];
    }

    const alerts = [];
    try {
        const stat = fs.statSync(state.logPath);
        if (stat.size <= state.lastSize) { state.lastSize = stat.size; return []; }

        const stream = fs.createReadStream(state.logPath, { start: state.lastSize, end: stat.size });
        state.lastSize = stat.size;

        const rl = readline.createInterface({ input: stream });
        await new Promise((resolve) => {
            rl.on('line', (line) => { const a = parseLine(line); if (a) alerts.push(a); });
            rl.on('close', resolve);
        });
    } catch (err) {
        logger.error(`❌ Error leyendo log auth: ${err.message}`);
    }

    return alerts;
}
