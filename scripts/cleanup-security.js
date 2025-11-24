// scripts/cleanup-security.ts (or .js)
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('../prisma/generated/prisma');

const db = new PrismaClient();

async function runCleanup() {
  try {
    console.log('Running security cleanup...');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30); // e.g. keep only last 30 days

    const [failedDeleted, blacklistedDeleted] = await Promise.all([
      db.failedAttempt.deleteMany({
        where: { createdAt: { lt: cutoff } },
      }),
      db.blacklistedIp.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
    ]);

    console.log('Cleanup completed:', {
      failedAttemptsDeleted: failedDeleted.count,
      blacklistedDeleted: blacklistedDeleted.count,
    });

    await db.$disconnect();
  } catch (error) {
    console.error('Error running cleanup:', error);
    await db.$disconnect();
    process.exit(1);
  }
}

runCleanup();