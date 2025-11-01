/**
 * Cleanup Duplicate Deals Script
 * Removes duplicate deals keeping only the oldest entry for each title
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables from parent .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up duplicate deals...');

  try {
    const workspaceId = '4542c01f-fa18-41fc-b232-e6d15a2ef0cd';

    // Get all deals for the workspace
    const allDeals = await prisma.deal.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });

    console.log(`Found ${allDeals.length} deals`);

    // Group by title to find duplicates
    const dealsByTitle = new Map<string, typeof allDeals>();

    for (const deal of allDeals) {
      const existing = dealsByTitle.get(deal.title);
      if (!existing) {
        dealsByTitle.set(deal.title, [deal]);
      } else {
        existing.push(deal);
      }
    }

    // Delete duplicates (keep first/oldest occurrence)
    let deletedCount = 0;

    for (const [title, deals] of dealsByTitle) {
      if (deals.length > 1) {
        console.log(`\n📋 "${title}": Found ${deals.length} copies`);

        // Keep the first one (oldest), delete the rest
        const toDelete = deals.slice(1);

        for (const deal of toDelete) {
          await prisma.deal.delete({
            where: { id: deal.id },
          });
          console.log(`   ✅ Deleted duplicate: ${deal.id.substring(0, 8)}...`);
          deletedCount++;
        }

        console.log(`   ✓ Kept original: ${deals[0].id.substring(0, 8)}...`);
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   Deleted: ${deletedCount} duplicate deals`);
    console.log(`   Remaining: ${dealsByTitle.size} unique deals`);

  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
