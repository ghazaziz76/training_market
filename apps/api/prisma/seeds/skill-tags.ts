import type { PrismaClient } from '@prisma/client';

const skillTags = [
  'Leadership', 'Strategic Thinking', 'Team Building', 'Decision Making',
  'Communication', 'Presentation', 'Negotiation', 'Conflict Resolution',
  'Sales', 'Closing Techniques', 'Account Management', 'Business Development',
  'Digital Marketing', 'SEO', 'Social Media', 'Content Strategy',
  'Financial Analysis', 'Budgeting', 'Forecasting', 'Tax Planning',
  'Microsoft Excel', 'Power BI', 'Data Visualization', 'SQL',
  'Python', 'JavaScript', 'Cloud Computing', 'AWS', 'Azure',
  'Cybersecurity', 'Network Security', 'Ethical Hacking', 'Data Privacy',
  'Project Management', 'Agile', 'Scrum', 'PMP',
  'OSHA', 'Workplace Safety', 'Risk Assessment', 'ISO 9001',
  'Lean Manufacturing', 'Six Sigma', 'Kaizen', 'Supply Chain',
  'Human Resources', 'Talent Management', 'Performance Appraisal', 'Recruitment',
  'Customer Service', 'Call Center', 'Client Relations',
  'Emotional Intelligence', 'Time Management', 'Problem Solving', 'Critical Thinking',
  'ESG', 'Sustainability', 'Carbon Accounting',
  'Industry 4.0', 'IoT', 'Automation', 'Robotics',
  'Artificial Intelligence', 'Machine Learning', 'Data Science',
  'First Aid', 'Fire Safety', 'Emergency Response',
  'Food Safety', 'HACCP', 'GMP',
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function seedSkillTags(prisma: PrismaClient) {
  console.log('Seeding skill tags...');

  for (const tag of skillTags) {
    await prisma.skillTag.upsert({
      where: { slug: slugify(tag) },
      update: { name: tag },
      create: { name: tag, slug: slugify(tag) },
    });
  }

  console.log(`  Created ${skillTags.length} skill tags`);
}
