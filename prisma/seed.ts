import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Super Admin Tenant (System)
  // Note: In this multi-tenant system, super admin might not need a tenant, 
  // but for consistency we might create a system tenant or just a user.
  // The schema allows User to have null tenantId for SUPER role.

  // Create a Demo Brand
  const demoBrand = await prisma.tenant.upsert({
    where: { slug: 'demo-brand' },
    update: {},
    create: {
      name: 'Demo Brand',
      slug: 'demo-brand',
      isStockModule: true,
      subscriptionStatus: 'ACTIVE', // Updated field name
    }
  });

  console.log(`Created brand: ${demoBrand.name}`);

  // Create Outlet
  const outlet = await prisma.outlet.upsert({
    where: {
      tenantId_code: {
        tenantId: demoBrand.id,
        code: 'KOR01'
      }
    },
    update: {},
    create: {
      tenantId: demoBrand.id,
      name: 'Koramangala Main',
      code: 'KOR01',
      address: '123, 4th Block, Koramangala, Bangalore',
      phone: '+91 98765 43210'
    }
  });

  console.log(`Created outlet: ${outlet.name}`);

  // Create Brand Admin
  const brandAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Brand Admin',
      role: UserRole.BRAND_ADMIN,
      tenantId: demoBrand.id,
      clerkId: 'user_demo_admin',
    }
  });

  console.log(`Created user: ${brandAdmin.name}`);

  // Create Outlet Manager
  await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      name: 'Outlet Manager',
      role: UserRole.OUTLET_MANAGER,
      tenantId: demoBrand.id,
      outletId: outlet.id,
      clerkId: 'user_demo_manager',
    }
  });

  // Create Staff
  await prisma.user.upsert({
    where: { email: 'staff@demo.com' },
    update: {},
    create: {
      email: 'staff@demo.com',
      name: 'Staff Member',
      role: UserRole.STAFF,
      tenantId: demoBrand.id,
      outletId: outlet.id,
      clerkId: 'user_demo_staff',
    }
  });

  console.log('✅ Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
