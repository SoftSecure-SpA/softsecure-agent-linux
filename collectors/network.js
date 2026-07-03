import { exec } from 'child_process';

const UNUSUAL_PORTS = [4444, 5555, 6666, 7777, 8888, 9999, 31337, 1337];
const SCAN_THRESHOLD = 20;

function parseSs(output) {
    return output.trim().split('\n').slice(1).map((line) => {
        const parts = line.trim().split(/\s+/);
        return { state: parts[0], localAddr: parts[4], peerAddr: parts[5], process: parts.slice(6).join(' ') };
    });
}

export async function collectNetworkEvents() {
    return new Promise((resolve) => {
        exec('ss -tnp 2>/dev/null || netstat -tnp 2>/dev/null', { timeout: 10000 }, (err, stdout) => {
            if (err || !stdout) { resolve([]); return; }

            const alerts = [];
            const conns = parseSs(stdout);
            const destCount = {};

            for (const c of conns) {
                if (!c.localAddr) continue;
                const localPort = parseInt(c.localAddr.split(':').pop(), 10);

                if (c.state === 'LISTEN' && UNUSUAL_PORTS.includes(localPort)) {
                    alerts.push({
                        ruleId: 'NET-001', ruleLevel: 10,
                        ruleDescription: `Puerto sospechoso en escucha: ${localPort} (${c.process || 'desconocido'})`,
                        ruleGroups: ['network', 'backdoor'], category: 'network', severity: 'critical',
                        location: c.localAddr, fullLog: JSON.stringify(c),
                        alertTimestamp: new Date().toISOString(), rawData: c,
                    });
                }

                if (c.state === 'ESTABLISHED' && c.peerAddr && c.peerAddr !== '*') {
                    const ip = c.peerAddr.split(':')[0];
                    destCount[ip] = (destCount[ip] || 0) + 1;
                }
            }

            for (const [ip, count] of Object.entries(destCount)) {
                if (count >= SCAN_THRESHOLD) {
                    alerts.push({
                        ruleId: 'NET-002', ruleLevel: 8,
                        ruleDescription: `Posible escaneo de puertos hacia ${ip} (${count} conexiones simultáneas)`,
                        ruleGroups: ['network', 'scan'], category: 'network', severity: 'high',
                        location: ip, fullLog: `${count} conexiones simultáneas hacia ${ip}`,
                        alertTimestamp: new Date().toISOString(), rawData: { destIp: ip, connectionCount: count },
                    });
                }
            }

            resolve(alerts);
        });
    });
}
