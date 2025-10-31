/**
 * Seed Demo Data Script
 * Populates database with sample workspace, users, and deals for testing
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Load environment variables from parent .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo data...');

  try {
    // Create demo user
    const user = await prisma.user.upsert({
      where: { email: 'demo@vectoros.ai' },
      update: {},
      create: {
        email: 'demo@vectoros.ai',
        name: 'Demo User',
        clerkId: 'demo-user-clerk-id',
      },
    });

    console.log('✅ Created demo user:', user.email);

    // Create demo workspace
    const workspace = await prisma.workspace.upsert({
      where: { slug: 'demo-workspace' },
      update: {},
      create: {
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        ownerId: user.id,
        tier: 'pro',
      },
    });

    console.log('✅ Created demo workspace:', workspace.name);

    // Create sample deals
    const deals = [
      {
        title: 'Enterprise SaaS Deal - Acme Corp',
        value: 150000,
        stage: 'proposal',
        probability: 65,
        contactName: 'John Smith',
        contactEmail: 'john@acme.com',
        company: 'Acme Corporation',
        description: 'Annual enterprise subscription for 500 seats',
        closeDate: new Date('2025-12-15'),
      },
      {
        title: 'Mid-Market Implementation - TechStart',
        value: 75000,
        stage: 'negotiation',
        probability: 80,
        contactName: 'Sarah Johnson',
        contactEmail: 'sarah@techstart.io',
        company: 'TechStart Inc',
        description: 'Initial setup and 6-month pilot program',
        closeDate: new Date('2025-11-30'),
      },
      {
        title: 'Discovery Call - InnovateLabs',
        value: 45000,
        stage: 'discovery',
        probability: 30,
        contactName: 'Mike Chen',
        contactEmail: 'mike@innovatelabs.com',
        company: 'InnovateLabs',
        description: 'Exploring automation opportunities',
        closeDate: new Date('2026-01-15'),
      },
      {
        title: 'Closed Won - DataFlow Systems',
        value: 200000,
        stage: 'closed_won',
        probability: 100,
        contactName: 'Emma Davis',
        contactEmail: 'emma@dataflow.com',
        company: 'DataFlow Systems',
        description: 'Multi-year contract signed',
        closeDate: new Date('2025-10-01'),
      },
      {
        title: 'Qualified Lead - CloudNine',
        value: 90000,
        stage: 'qualified',
        probability: 40,
        contactName: 'Alex Rodriguez',
        contactEmail: 'alex@cloudnine.co',
        company: 'CloudNine Technologies',
        description: 'Budget approved, evaluating solutions',
        closeDate: new Date('2025-12-31'),
      },
    ];

    for (const dealData of deals) {
      const { description, ...rest } = dealData;
      const deal = await prisma.deal.create({
        data: {
          ...rest,
          workspaceId: workspace.id,
          source: 'demo',
        },
      });

      console.log(`✅ Created deal: ${deal.title}`);
    }

    console.log('\n🎉 Demo data seeded successfully!');
    console.log(`\n📝 Demo Credentials:
      Email: demo@vectoros.ai
      Workspace: Demo Workspace (slug: demo-workspace)
      Workspace ID: ${workspace.id}
    `);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
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
