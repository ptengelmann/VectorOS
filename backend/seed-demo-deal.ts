/**
 * Seed demo workspace with a test deal
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_WORKSPACE_ID = '4542c01f-fa18-41fc-b232-e6d15a2ef0cd';

async function seedDemoDeal() {
  try {
    console.log('🌱 Seeding demo workspace with test deal...');

    // Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: DEMO_WORKSPACE_ID }
    });

    if (!workspace) {
      console.log('❌ Demo workspace not found, creating it...');
      await prisma.workspace.create({
        data: {
          id: DEMO_WORKSPACE_ID,
          name: 'Demo Workspace',
          slug: 'demo-workspace',
        }
      });
      console.log('✅ Created demo workspace');
    }

    // Create test deal
    const deal = await prisma.deal.create({
      data: {
        workspaceId: DEMO_WORKSPACE_ID,
        title: 'IV Creative - Enterprise',
        company: 'IV Creative',
        value: 5000,
        stage: 'lead',
        probability: 30,
        contactName: 'Pedro Perez Serapia',
        contactEmail: 'pedro@ivcreative.com',
        source: 'website',
        notes: 'Enterprise plan inquiry from website',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago (stale!)
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // No activity in 15 days
      }
    });

    console.log('✅ Created test deal:', {
      id: deal.id,
      title: deal.title,
      workspaceId: deal.workspaceId,
      value: deal.value,
      stage: deal.stage
    });

    console.log('\n📊 Now you can test insights generation at:');
    console.log(`curl -X POST http://localhost:3001/api/v1/workspaces/${DEMO_WORKSPACE_ID}/insights/generate`);

  } catch (error) {
    console.error('❌ Error seeding deal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoDeal();
