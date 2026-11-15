#!/usr/bin/env node
/**
 * Read-only snapshot backup of all database tables to ./backups/backup-<timestamp>.json
 * Usage: npm run db:backup
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(outDir, { recursive: true });

  const [
    users,
    habits,
    dailyLogs,
    friendships,
    studyRooms,
    studyRoomMembers,
    pushTokens,
    scheduledPushes,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.habit.findMany(),
    prisma.dailyLog.findMany(),
    prisma.friendship.findMany(),
    prisma.studyRoom.findMany(),
    prisma.studyRoomMember.findMany(),
    prisma.pushToken.findMany(),
    prisma.scheduledPush.findMany(),
  ]);

  const payload = {
    createdAt: new Date().toISOString(),
    counts: {
      users: users.length,
      habits: habits.length,
      dailyLogs: dailyLogs.length,
      friendships: friendships.length,
      studyRooms: studyRooms.length,
      studyRoomMembers: studyRoomMembers.length,
      pushTokens: pushTokens.length,
      scheduledPushes: scheduledPushes.length,
    },
    data: {
      users,
      habits,
      dailyLogs,
      friendships,
      studyRooms,
      studyRoomMembers,
      pushTokens,
      scheduledPushes,
    },
  };

  const outFile = path.join(outDir, `backup-${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Backup saved:', outFile);
  console.log('Counts:', payload.counts);
}

main()
  .catch((err) => {
    console.error('Backup failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
