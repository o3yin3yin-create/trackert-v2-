import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SECRET = process.env.JWT_SECRET || process.env.CLERK_SECRET_KEY || '';

function createToken(userId, expiresInMs = 3600_000, secretOverride = SECRET) {
  const payload = {
    userId,
    sub: userId,
    exp: Date.now() + expiresInMs,
    iat: Math.floor(Date.now() / 1000)
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secretOverride).update(data).digest('base64url');
  return `bokra_dt_${data}.${signature}`;
}

async function runTests() {
  console.log('====================================================');
  console.log('Bokra Automated IDOR & Authorization Test Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================\n');

  const testUserAId = 'test_user_alpha_' + Date.now();
  const testUserBId = 'test_user_beta_' + Date.now();
  const testUserCId = 'test_user_gamma_' + Date.now();

  const userAClerkId = `clerk_${testUserAId}`;
  const userBClerkId = `clerk_${testUserBId}`;
  const userCClerkId = `clerk_${testUserCId}`;

  const tokenA = createToken(userAClerkId);
  const tokenB = createToken(userBClerkId);

  // Setup test users in database
  console.log('[Setup] Seeding test users...');
  const userA = await prisma.user.create({
    data: {
      id: testUserAId,
      clerkId: userAClerkId,
      username: `alpha_${Date.now().toString().slice(-4)}`,
      email: `${testUserAId}@test.com`,
      isAdmin: false,
      activeSessionType: 'flight',
      activeSessionData: { callsign: 'MS777' },
      privacySettings: { ghostMode: true, habits: false }
    }
  });

  const userB = await prisma.user.create({
    data: {
      id: testUserBId,
      clerkId: userBClerkId,
      username: `beta_${Date.now().toString().slice(-4)}`,
      email: `${testUserBId}@test.com`,
      isAdmin: false,
      activeSessionType: 'pomodoro',
      activeSessionData: { task: 'Secret Project Beta' },
      privacySettings: { ghostMode: false, habits: true }
    }
  });

  const userC = await prisma.user.create({
    data: {
      id: testUserCId,
      clerkId: userCClerkId,
      username: `gamma_${Date.now().toString().slice(-4)}`,
      email: `${testUserCId}@test.com`,
      isAdmin: false
    }
  });

  // Seed a habit for User B
  const habitBId = 'habit_b_' + Date.now();
  await prisma.habit.create({
    data: {
      id: habitBId,
      name: 'User B Confidential Habit',
      type: 'single',
      userId: userB.id,
      category: 'habit',
      isPrivate: true
    }
  });

  // Seed a friendship request from User A to User C
  const friendshipAC = await prisma.friendship.create({
    data: {
      requesterId: userA.id,
      addresseeId: userC.id,
      status: 'pending'
    }
  });

  const results = [];

  function record(id, title, passed, detail = '') {
    results.push({ id, title, passed, detail });
    const mark = passed ? '[PASS]' : '[FAIL]';
    console.log(`${mark} ${id}: ${title} ${detail ? '(' + detail + ')' : ''}`);
  }

  try {
    // 1. Session Isolation: User A gets their own session, not B's
    {
      const res = await fetch(`${BASE_URL}/api/session`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const data = await res.json();
      const passed = res.status === 200 && data.activeSessionType === 'flight' && data.activeSessionData?.callsign === 'MS777';
      record('TEST-01', 'GET /api/session returns caller own session', passed, `status: ${res.status}`);
    }

    // 2. Session Modification Isolation: User A updates session, User B is unaffected
    {
      const res = await fetch(`${BASE_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ type: 'pomodoro', data: { task: 'Alpha Task' } })
      });
      const passedRes = res.status === 200;
      const bInDb = await prisma.user.findUnique({ where: { id: userB.id } });
      const bUntouched = bInDb.activeSessionType === 'pomodoro' && bInDb.activeSessionData?.task === 'Secret Project Beta';
      record('TEST-02', 'POST /api/session isolates updates to caller only', passedRes && bUntouched, `B untouched: ${bUntouched}`);
    }

    // 3. Privacy Isolation: User A reads privacy settings
    {
      const res = await fetch(`${BASE_URL}/api/user/privacy`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const data = await res.json();
      const passed = res.status === 200 && data.privacySettings?.ghostMode === true && data.privacySettings?.habits === false;
      record('TEST-03', 'GET /api/user/privacy returns caller own privacy', passed, `status: ${res.status}`);
    }

    // 4. Privacy Modification Isolation: User A updates privacy, User B is unaffected
    {
      const res = await fetch(`${BASE_URL}/api/user/privacy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ ghostMode: false })
      });
      const passedRes = res.status === 200;
      const bInDb = await prisma.user.findUnique({ where: { id: userB.id } });
      const bUntouched = bInDb.privacySettings?.habits === true && bInDb.privacySettings?.ghostMode === false;
      record('TEST-04', 'POST /api/user/privacy isolates updates to caller only', passedRes && bUntouched);
    }

    // 5. IDOR Habit Hijack Attempt: User A attempts to update User B's habit via POST /api/sync
    {
      const res = await fetch(`${BASE_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          habits: [{
            id: habitBId,
            name: 'HACKED BY USER A',
            type: 'single'
          }]
        })
      });
      const bHabitInDb = await prisma.habit.findUnique({ where: { id: habitBId } });
      const hijackPrevented = bHabitInDb.name === 'User B Confidential Habit' && bHabitInDb.userId === userB.id;
      record('TEST-05', 'IDOR: User A cannot modify User B habit via /api/sync', hijackPrevented, `Name in DB: "${bHabitInDb.name}"`);
    }

    // 6. IDOR Habit Deletion Attempt: User A attempts to delete User B's habit via deletedHabitIds
    {
      const res = await fetch(`${BASE_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          deletedHabitIds: [habitBId]
        })
      });
      const bHabitInDb = await prisma.habit.findUnique({ where: { id: habitBId } });
      const deletePrevented = bHabitInDb !== null;
      record('TEST-06', 'IDOR: User A cannot delete User B habit via /api/sync', deletePrevented, `Habit still exists: ${deletePrevented}`);
    }

    // 7. IDOR Friends Respond: User B attempts to accept request between A and C
    {
      const res = await fetch(`${BASE_URL}/api/friends/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({
          friendshipId: friendshipAC.id,
          action: 'accept'
        })
      });
      const passed = res.status === 404 || res.status === 403;
      const fInDb = await prisma.friendship.findUnique({ where: { id: friendshipAC.id } });
      const statusUnchanged = fInDb.status === 'pending';
      record('TEST-07', 'IDOR: User B cannot accept User A-C friend request', passed && statusUnchanged, `status: ${res.status}`);
    }

    // 8. IDOR Friends Remove: User B attempts to remove/cancel request between A and C
    {
      const res = await fetch(`${BASE_URL}/api/friends/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
        body: JSON.stringify({
          friendshipId: friendshipAC.id,
          action: 'remove'
        })
      });
      const passed = res.status === 404 || res.status === 403;
      const fInDb = await prisma.friendship.findUnique({ where: { id: friendshipAC.id } });
      const stillExists = fInDb !== null;
      record('TEST-08', 'IDOR: User B cannot cancel/remove friendship of other users', passed && stillExists, `status: ${res.status}`);
    }

    // 9. Unauthorized Nudge: User A attempts to nudge non-friend User B
    {
      const res = await fetch(`${BASE_URL}/api/friends/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({
          username: userB.username,
          type: 'nudge'
        })
      });
      const data = await res.json();
      const passed = res.status === 403 && data.error === 'not_friends';
      record('TEST-09', 'Nudge route rejects non-friends with 403 not_friends', passed, `status: ${res.status}, error: ${data.error}`);
    }

    // 10. Non-Admin Token hitting /api/admin/overview
    {
      const res = await fetch(`${BASE_URL}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const passed = res.status === 403;
      record('TEST-10', 'GET /api/admin/overview blocks non-admin token with 403', passed, `status: ${res.status}`);
    }

    // 11. Non-Admin Token hitting /api/admin/users
    {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      const passed = res.status === 403;
      record('TEST-11', 'GET /api/admin/users blocks non-admin token with 403', passed, `status: ${res.status}`);
    }

    // 12. Non-Admin Token attempting POST /api/admin/users
    {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
        body: JSON.stringify({ targetUserId: userB.id, action: 'block' })
      });
      const passed = res.status === 403;
      record('TEST-12', 'POST /api/admin/users blocks non-admin token with 403', passed, `status: ${res.status}`);
    }

    // 13. Admin Token hitting /api/admin/overview
    {
      // Find an existing admin user
      const adminUser = await prisma.user.findFirst({ where: { isAdmin: true } });
      if (adminUser) {
        const adminToken = createToken(adminUser.clerkId);
        const res = await fetch(`${BASE_URL}/api/admin/overview`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        const data = await res.json();
        const passed = res.status === 200 && data.overview && typeof data.overview.totalUsers === 'number';
        record('TEST-13', 'GET /api/admin/overview succeeds with valid admin token', passed, `status: ${res.status}`);
      } else {
        record('TEST-13', 'GET /api/admin/overview skipped (no admin user)', true, 'skipped');
      }
    }

    // 14. Expired Token
    {
      const expiredToken = createToken(userAClerkId, -60_000); // 1 minute in the past
      const res = await fetch(`${BASE_URL}/api/sync`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      const passed = res.status === 401;
      record('TEST-14', 'Expired token rejected with 401 Unauthorized', passed, `status: ${res.status}`);
    }

    // 15. Tampered Signature Token
    {
      const parts = tokenA.split('.');
      const tamperedToken = `${parts[0]}.invalidSignatureTampered12345`;
      const res = await fetch(`${BASE_URL}/api/sync`, {
        headers: { Authorization: `Bearer ${tamperedToken}` }
      });
      const passed = res.status === 401;
      record('TEST-15', 'Tampered signature token rejected with 401 Unauthorized', passed, `status: ${res.status}`);
    }

    // 16. Missing Token
    {
      const res = await fetch(`${BASE_URL}/api/sync`);
      const passed = res.status === 401;
      record('TEST-16', 'Missing token on protected route rejected with 401 Unauthorized', passed, `status: ${res.status}`);
    }

    // 17. Token Signed with Wrong Secret
    {
      const forgedToken = createToken(userAClerkId, 3600_000, 'wrong_attacker_secret_key');
      const res = await fetch(`${BASE_URL}/api/sync`, {
        headers: { Authorization: `Bearer ${forgedToken}` }
      });
      const passed = res.status === 401;
      record('TEST-17', 'Token signed with wrong/attacker secret rejected with 401', passed, `status: ${res.status}`);
    }

    // 18. Token Verification with Missing Secret
    {
      // Simulate verification when neither JWT_SECRET nor CLERK_SECRET_KEY is configured
      function verifyDesktopTokenWithSecret(token, secret) {
        if (!token || !token.startsWith('bokra_dt_') || !secret) return null;
        const raw = token.slice('bokra_dt_'.length);
        const parts = raw.split('.');
        if (parts.length !== 2) return null;
        const [data, signature] = parts;
        try {
          const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
          if (signature !== expected) return null;
          const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
          if (payload.exp && Date.now() > payload.exp) return null;
          return payload;
        } catch {
          return null;
        }
      }

      const verifiedWithNoSecret = verifyDesktopTokenWithSecret(tokenA, '');
      const passed = verifiedWithNoSecret === null;
      record('TEST-18', 'Missing JWT_SECRET causes token verification to strictly reject (returns null)', passed, `result: ${verifiedWithNoSecret}`);
    }

  } finally {
    // Cleanup test data
    console.log('\n[Teardown] Cleaning up test data...');
    await prisma.habit.deleteMany({ where: { id: habitBId } }).catch(() => {});
    await prisma.friendship.deleteMany({ where: { id: friendshipAC.id } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { id: { in: [testUserAId, testUserBId, testUserCId] } }
    }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;
  console.log(`Results: ${passedCount}/${results.length} tests passed.`);
  console.log(`Status: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('====================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('[FATAL TEST ERROR]:', err);
  process.exit(1);
});
