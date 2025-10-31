/**
 * Add Demo Deals to Workspace
 * Run with: npx tsx scripts/add-deals-to-workspace.ts <workspaceId>
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const workspaceId = process.argv[2];

  if (!workspaceId) {
    console.error('❌ Please provide a workspace ID');
    console.error('Usage: npx tsx scripts/add-deals-to-workspace.ts <workspaceId>');
    process.exit(1);
  }

  console.log(`🌱 Adding demo deals to workspace: ${workspaceId}`);

  try {
    // Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { owner: true },
    });

    if (!workspace) {
      console.error(`❌ Workspace not found: ${workspaceId}`);
      process.exit(1);
    }

    console.log(`✅ Found workspace: ${workspace.name} (owner: ${workspace.owner.email})`);

    // Sample deals
    const deals = [
      {
        title: 'Enterprise SaaS Deal - Acme Corp',
        value: 150000,
        stage: 'proposal',
        probability: 65,
        contactName: 'John Smith',
        contactEmail: 'john@acme.com',
        company: 'Acme Corporation',
        closeDate: new Date('2025-12-15'),
        assignedToId: workspace.ownerId,
      },
      {
        title: 'Mid-Market Implementation - TechStart',
        value: 75000,
        stage: 'negotiation',
        probability: 80,
        contactName: 'Sarah Johnson',
        contactEmail: 'sarah@techstart.io',
        company: 'TechStart Inc',
        closeDate: new Date('2025-11-30'),
        assignedToId: workspace.ownerId,
      },
      {
        title: 'Discovery Call - InnovateLabs',
        value: 45000,
        stage: 'qualified',
        probability: 30,
        contactName: 'Mike Chen',
        contactEmail: 'mike@innovatelabs.com',
        company: 'InnovateLabs',
        closeDate: new Date('2026-01-15'),
        assignedToId: workspace.ownerId,
      },
      {
        title: 'Closed Won - DataFlow Systems',
        value: 200000,
        stage: 'won',
        probability: 100,
        contactName: 'Emma Davis',
        contactEmail: 'emma@dataflow.com',
        company: 'DataFlow Systems',
        closeDate: new Date('2025-10-01'),
        assignedToId: workspace.ownerId,
      },
      {
        title: 'Qualified Lead - CloudNine',
        value: 90000,
        stage: 'qualified',
        probability: 40,
        contactName: 'Alex Rodriguez',
        contactEmail: 'alex@cloudnine.co',
        company: 'CloudNine Technologies',
        closeDate: new Date('2025-12-31'),
        assignedToId: workspace.ownerId,
      },
      {
        title: 'New Lead - FinTech Solutions',
        value: 120000,
        stage: 'lead',
        probability: 20,
        contactName: 'Maria Garcia',
        contactEmail: 'maria@fintech.com',
        company: 'FinTech Solutions',
        closeDate: new Date('2026-02-01'),
        assignedToId: workspace.ownerId,
      },
    ];

    let createdCount = 0;
    for (const dealData of deals) {
      const deal = await prisma.deal.create({
        data: {
          ...dealData,
          workspaceId: workspace.id,
          source: 'demo',
        },
      });

      console.log(`✅ Created deal: ${deal.title}`);
      createdCount++;
    }

    console.log(`\n🎉 Successfully created ${createdCount} demo deals!`);
    console.log(`\n📊 Dashboard: http://localhost:3000/dashboard`);
  } catch (error) {
    console.error('❌ Error adding deals:', error);
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
