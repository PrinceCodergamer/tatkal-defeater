import { prisma } from './client';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a sample resource (train)
  const trainResource = await prisma.inventorySlot.createMany({
    data: Array.from({ length: 40 }, (_, i) => ({
      resourceId: 'train-rajdhani-12309',
      resourceType: 'TRAIN',
      label: `SL-${String(i + 1).padStart(3, '0')}`,
      slotDate: new Date(Date.now() + 86400000), // tomorrow
      totalCapacity: 1,
      availableCapacity: 1,
      version: 1,
      price: 1500,
      metadata: {
        trainName: 'Rajdhani Express',
        trainNumber: '12309',
        from: 'NDLS',
        to: 'BCT',
        class: '3AC',
        quota: 'TATKAL',
      },
    })),
  });

  console.log(`✅ Created ${trainResource.count} inventory slots`);
  console.log('🎉 Seed complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
