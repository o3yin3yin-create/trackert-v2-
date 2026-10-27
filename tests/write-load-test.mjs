import 'dotenv/config';
import autocannon from 'autocannon';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import os from 'os';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SECRET = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY || 'bokra_desktop_fallback_secret_key_3910';

function createToken(userId, expiresInMs = 7200_000) {
  const payload = { userId, sub: userId, exp: Date.now() + expiresInMs, iat: Math.floor(Date.now() / 1000) };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `bokra_dt_${data}.${signature}`;
}

const NUM_USERS = 30;
const testUsers = [];

async function setupUsers() {
  console.log(`[Setup] Preparing ${NUM_USERS} distinct test users in database...`);
  for (let i = 0; i < NUM_USERS; i++) {
    const id = `load_wr_user_${i}`;
    const clerkId = `clerk_${id}`;
    const token = createToken(clerkId);
    
    await prisma.user.upsert({
      where: { clerkId },
      update: {
        activeSessionType: 'pomodoro',
        activeSessionData: { task: `Task ${i}` }
      },
      create: {
        id,
        clerkId,
        username: `wruser_${i}`,
        email: `wruser_${i}@bokra.app`,
        activeSessionType: 'pomodoro',
        activeSessionData: { task: `Task ${i}` }
      }
    });

    testUsers.push({ id, clerkId, token });
  }
  console.log(`[Setup] All ${NUM_USERS} test users ready.`);
}

async function cleanupUsers() {
  console.log('[Teardown] Cleaning up test users...');
  const ids = testUsers.map(u => u.id);
  await prisma.habit.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  await prisma.$disconnect();
}

async function runStep(name, connections, durationSeconds = 10) {
  console.log(`\n--------------------------------------------------------------`);
  console.log(`Step: ${name} | Concurrency: ${connections} | Duration: ${durationSeconds}s`);
  console.log(`--------------------------------------------------------------`);

  // Build requests array alternating between users and write endpoints
  const requests = [];
  for (let i = 0; i < testUsers.length; i++) {
    const u = testUsers[i];
    // 1. Session write (POST)
    requests.push({
      method: 'POST',
      path: '/api/session',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${u.token}`
      },
      body: JSON.stringify({
        type: 'pomodoro',
        data: { task: `Writing update from connection ${i} at ${Date.now()}` }
      })
    });

    // 2. Sync write with habit (POST)
    requests.push({
      method: 'POST',
      path: '/api/sync',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${u.token}`
      },
      body: JSON.stringify({
        theme: 'dark',
        habits: [
          {
            id: `wr_habit_${u.id}`,
            name: `Daily Routine ${i}`,
            type: 'single',
            category: 'habit'
          }
        ]
      })
    });

    // 3. Uncached DB read (GET with x-bypass-cache)
    requests.push({
      method: 'GET',
      path: '/api/session',
      headers: {
        Authorization: `Bearer ${u.token}`,
        'x-bypass-cache': '1'
      }
    });
  }

  const memBefore = process.memoryUsage();

  const result = await autocannon({
    url: BASE_URL,
    connections,
    duration: durationSeconds,
    pipelining: 1,
    requests
  });

  const memAfter = process.memoryUsage();
  const cpuLoad = os.loadavg()[0];

  const totalReqs = result.requests.total;
  const reqPerSec = result.requests.average;
  const avgLatency = result.latency.average;
  const p90 = result.latency.p90 || avgLatency;
  const p97_5 = result.latency.p97_5 || avgLatency;
  const p95Latency = Math.round(p90 * 0.33 + p97_5 * 0.67);
  const p99Latency = result.latency.p99;
  const errors = result.errors + result.timeouts + (result['5xx'] || 0);
  const errorRate = totalReqs > 0 ? parseFloat(((errors / (totalReqs + errors)) * 100).toFixed(2)) : 0;

  console.log(`Req/s: ${reqPerSec.toFixed(1)} | Avg Latency: ${avgLatency.toFixed(1)}ms | p95: ${p95Latency}ms | p99: ${p99Latency}ms`);
  console.log(`Total Requests: ${totalReqs} | Errors: ${errors} (${errorRate}%)`);
  console.log(`Memory RSS: ${(memAfter.rss / 1024 / 1024).toFixed(1)} MB | CPU Load: ${cpuLoad.toFixed(2)}`);

  return {
    step: name,
    connections,
    reqPerSec: parseFloat(reqPerSec.toFixed(1)),
    avgLatency: parseFloat(avgLatency.toFixed(1)),
    p95Latency,
    p99Latency,
    errors,
    errorRate,
    totalReqs,
    memMB: parseFloat((memAfter.rss / 1024 / 1024).toFixed(1)),
    cpuLoad: parseFloat(cpuLoad.toFixed(2))
  };
}

async function main() {
  await setupUsers();
  const steps = [];
  let breakingPoint = null;

  try {
    const concurrencySteps = [2, 5, 8, 12, 16, 25];

    for (const c of concurrencySteps) {
      const stepReport = await runStep(`Concurrency ${c}`, c, 10);
      steps.push(stepReport);

      if (stepReport.p95Latency > 1000 || stepReport.errorRate > 1.0) {
        breakingPoint = stepReport;
        console.log(`\n>>> BREAKING POINT REACHED at concurrency ${c}: p95 = ${stepReport.p95Latency}ms, errors = ${stepReport.errorRate}% <<<`);
        break;
      }
    }

    console.log('\n==============================================================');
    console.log('WRITE-PATH RAMP-UP SUMMARY TABLE:');
    console.table(steps);
    console.log('==============================================================\n');

    // If breaking point was found, run 15-minute soak at ~70% of breaking load
    // For test efficiency, let's determine soak concurrency
    const bpConcurrency = breakingPoint ? breakingPoint.connections : steps[steps.length - 1].connections;
    const soakConcurrency = Math.max(5, Math.round(bpConcurrency * 0.7));

    console.log(`\n==============================================================`);
    console.log(`Starting Sustained Soak Test at ~70% breaking load (${soakConcurrency} connections)...`);
    console.log(`==============================================================`);

    // We run the soak test (duration: 60s for immediate reporting or configured via SOAK_DURATION)
    const soakDuration = parseInt(process.env.SOAK_DURATION || '180', 10); // default 3 minutes (180s) or 900s
    console.log(`Soak duration: ${soakDuration}s`);
    const soakReport = await runStep(`Sustained Soak (${soakDuration}s)`, soakConcurrency, soakDuration);

    console.log('\n==============================================================');
    console.log('SOAK TEST RESULT:');
    console.table([soakReport]);
    console.log('==============================================================\n');

  } finally {
    await cleanupUsers();
  }
}

main().catch(err => {
  console.error('[FATAL WRITE LOAD TEST ERROR]:', err);
  process.exit(1);
});
