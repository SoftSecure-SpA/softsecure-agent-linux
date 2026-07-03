import { exec } from 'child_process';

const SUSPICIOUS_NAMES = [
    'nmap', 'masscan', 'nikto', 'sqlmap', 'msfconsole',
    'hydra', 'john', 'hashcat', 'aircrack', 'netcat',
    'xmrig', 'minerd', 'ccminer',
];

const SUSPICIOUS_PATHS = [/^\/tmp\//, /^\/dev\/shm\//];

function parsePs(output) {
    return output.trim().split('\n').map((line) => {
        const parts = line.trim().split(/\s+/);
        return { pid: parts[0], user: parts[1], cpu: parts[2], mem: parts[3], cmd: parts.slice(10).join(' ') };
    }).filter((p) => p.pid && p.cmd);
}

function suspicious(proc) {
    const lower = proc.cmd.toLowerCase();
    for (const name of SUSPICIOUS_NAMES) {
        if (lower.includes(name)) return `Herramienta de ataque detectada: ${name}`;
    }
    for (const pat of SUSPICIOUS_PATHS) {
        if (pat.test(proc.cmd)) return `Ejecutable desde ruta sospechosa: ${proc.cmd.slice(0, 80)}`;
    }
    if (parseFloat(proc.cpu) > 90) return `CPU elevada (${proc.cpu}%): ${proc.cmd.slice(0, 80)}`;
    return null;
}

export async function collectProcessEvents() {
    return new Promise((resolve) => {
        exec('ps aux --no-headers', { timeout: 10000 }, (err, stdout) => {
            if (err) { resolve([]); return; }
            const alerts = [];
            for (const proc of parsePs(stdout)) {
                const reason = suspicious(proc);
                if (reason) {
                    alerts.push({
                        ruleId: 'PROC-001', ruleLevel: 9,
                        ruleDescription: reason,
                        ruleGroups: ['process', 'security'], category: 'system', severity: 'high',
                        location: `PID ${proc.pid}`,
                        fullLog: `User: ${proc.user} | PID: ${proc.pid} | CPU: ${proc.cpu}% | CMD: ${proc.cmd}`,
                        alertTimestamp: new Date().toISOString(),
                        rawData: { pid: proc.pid, user: proc.user, cpu: proc.cpu, mem: proc.mem, cmd: proc.cmd },
                    });
                }
            }
            resolve(alerts);
        });
    });
}
