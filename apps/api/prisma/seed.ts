import { PrismaClient } from '@prisma/client';
import { seedCategories } from './seeds/categories';
import { seedSkillTags } from './seeds/skill-tags';
import { seedUsers } from './seeds/users';
import { seedPrograms } from './seeds/programs';
import { seedSubscriptionPlans } from './seeds/subscription-plans';
import { seedHrdCorpRules } from './seeds/hrd-corp-rules';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  await seedCategories(prisma);
  await seedSkillTags(prisma);
  await seedSubscriptionPlans(prisma);
  await seedHrdCorpRules(prisma);
  await seedUsers(prisma);
  await seedPrograms(prisma);

  console.log('\nSeeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
