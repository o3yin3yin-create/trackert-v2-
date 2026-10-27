import autocannon from 'autocannon';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import os from 'os';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SECRET = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY || 'bokra_desktop_fallback_secret_key_3910';

function createToken(userId, expiresInMs = 3600_000) {
  const payload = { userId, sub: userId, exp: Date.now() + expiresInMs, iat: Math.floor(Date.now() / 1000) };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `bokra_dt_${data}.${signature}`;
}

async function runScenario(name, connections, duration, pipelining = 1) {
  console.log(`\n======================================================`);
  console.log(`[Scenario: ${name}] Connections: ${connections}, Duration: ${duration}s, Pipelining: ${pipelining}`);
  console.log(`======================================================`);

  const testUserId = 'load_test_user_bench';
  const clerkId = `clerk_${testUserId}`;
  const token = createToken(clerkId);

  // Ensure test user exists in DB
  await prisma.user.upsert({
    where: { clerkId },
    update: { activeSessionType: 'pomodoro', activeSessionData: { task: 'Benchmark task' } },
    create: {
      id: testUserId,
      clerkId,
      username: 'loadbench',
      email: 'bench@bokra.app',
      activeSessionType: 'pomodoro',
      activeSessionData: { task: 'Benchmark task' }
    }
  });

  const cpuBefore = os.loadavg();
  const memBefore = process.memoryUsage();

  const result = await autocannon({
    url: `${BASE_URL}/api/session`,
    connections,
    duration,
    pipelining,
    headers: {
      Authorization: `Bearer ${token}`
    },
    requests: [
      // 70% reads
      { method: 'GET', path: '/api/session' },
      { method: 'GET', path: '/api/session' },
      { method: 'GET', path: '/api/session' },
      { method: 'GET', path: '/api/session' },
      { method: 'GET', path: '/api/session' },
      { method: 'GET', path: '/api/session' },
      { method: 'GET', path: '/api/session' },
      // 30% writes
      {
        method: 'POST',
        path: '/api/session',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pomodoro', data: { task: 'Focus Session Bench' } })
      },
      {
        method: 'POST',
        path: '/api/session',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'flight', data: { callsign: 'BOKRA1' } })
      },
      {
        method: 'POST',
        path: '/api/session',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: null, data: null })
      }
    ]
  });

  const cpuAfter = os.loadavg();
  const memAfter = process.memoryUsage();

  const totalReqs = result.requests.total;
  const reqPerSec = result.requests.average;
  const avgLatency = result.latency.average;
  // Calculate p95 from p90 and p97_5 or use p97_5 as conservative bound
  const p95Latency = Math.round(((result.latency.p90 || avgLatency) * 0.33) + ((result.latency.p97_5 || avgLatency) * 0.67));
  const p99Latency = result.latency.p99;
  const errors = result.errors + result.timeouts;
  const errorRate = totalReqs > 0 ? ((errors / (totalReqs + errors)) * 100).toFixed(2) : '0.00';

  console.log(`Requests/sec: ${reqPerSec.toFixed(1)}`);
  console.log(`Latency: Avg = ${avgLatency.toFixed(1)}ms | p95 = ${p95Latency}ms | p99 = ${p99Latency}ms`);
  console.log(`Total Requests: ${totalReqs} | Errors: ${errors} (${errorRate}%)`);
  console.log(`Memory RSS: ${(memAfter.rss / 1024 / 1024).toFixed(1)} MB (diff: ${((memAfter.rss - memBefore.rss) / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`CPU Load: ${cpuAfter[0].toFixed(2)} (1m avg)`);

  return {
    scenario: name,
    connections,
    duration,
    reqPerSec,
    avgLatency,
    p95Latency,
    p99Latency,
    errors,
    errorRate: parseFloat(errorRate),
    totalReqs,
    memMB: (memAfter.rss / 1024 / 1024).toFixed(1),
    cpuLoad: cpuAfter[0].toFixed(2)
  };
}

async function main() {
  const reports = [];
  try {
    // 1. Baseline: 10 connections, 10s
    reports.push(await runScenario('Baseline (Normal Load)', 10, 10));

    // 2. High Load: 35 connections, 10s
    reports.push(await runScenario('High Load', 35, 10));

    // 3. Ramp-up to Breaking Point: 65 connections, 10s
    reports.push(await runScenario('Ramp-up (Breaking Point Seek)', 65, 10));

    // 4. Sudden Spike: 100 connections, 8s
    reports.push(await runScenario('Sudden Spike', 100, 8));

    // 5. Sustained Soak: 25 connections, 30s
    reports.push(await runScenario('Sustained Soak', 25, 30));

    console.log('\n======================================================');
    console.log('SUMMARY TABLE:');
    console.table(reports);
    console.log('======================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('Benchmark Error:', err);
  process.exit(1);
});
