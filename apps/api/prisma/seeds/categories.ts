import type { PrismaClient } from '@prisma/client';

const categories = [
  {
    name: 'Technology and IT',
    slug: 'technology-and-it',
    icon: 'monitor',
    sort_order: 1,
    subcategories: [
      { name: 'Software Development', slug: 'software-development' },
      { name: 'Cybersecurity', slug: 'cybersecurity' },
      { name: 'Cloud Computing', slug: 'cloud-computing' },
      { name: 'Data Science and Analytics', slug: 'data-science-and-analytics' },
      { name: 'Artificial Intelligence', slug: 'artificial-intelligence' },
      { name: 'Networking and Infrastructure', slug: 'networking-and-infrastructure' },
      { name: 'IT Project Management', slug: 'it-project-management' },
    ],
  },
  {
    name: 'Leadership and Management',
    slug: 'leadership-and-management',
    icon: 'users',
    sort_order: 2,
    subcategories: [
      { name: 'Strategic Leadership', slug: 'strategic-leadership' },
      { name: 'Team Management', slug: 'team-management' },
      { name: 'Change Management', slug: 'change-management' },
      { name: 'Executive Development', slug: 'executive-development' },
      { name: 'Supervisory Skills', slug: 'supervisory-skills' },
    ],
  },
  {
    name: 'Sales and Marketing',
    slug: 'sales-and-marketing',
    icon: 'trending-up',
    sort_order: 3,
    subcategories: [
      { name: 'Sales Techniques', slug: 'sales-techniques' },
      { name: 'Digital Marketing', slug: 'digital-marketing' },
      { name: 'Social Media Marketing', slug: 'social-media-marketing' },
      { name: 'Content Marketing', slug: 'content-marketing' },
      { name: 'Customer Relationship Management', slug: 'customer-relationship-management' },
    ],
  },
  {
    name: 'Finance and Accounting',
    slug: 'finance-and-accounting',
    icon: 'dollar-sign',
    sort_order: 4,
    subcategories: [
      { name: 'Financial Analysis', slug: 'financial-analysis' },
      { name: 'Accounting Standards', slug: 'accounting-standards' },
      { name: 'Tax Planning', slug: 'tax-planning' },
      { name: 'Budgeting and Forecasting', slug: 'budgeting-and-forecasting' },
      { name: 'Audit and Compliance', slug: 'audit-and-compliance' },
    ],
  },
  {
    name: 'Human Resources',
    slug: 'human-resources',
    icon: 'user-check',
    sort_order: 5,
    subcategories: [
      { name: 'Talent Acquisition', slug: 'talent-acquisition' },
      { name: 'Performance Management', slug: 'performance-management' },
      { name: 'Compensation and Benefits', slug: 'compensation-and-benefits' },
      { name: 'Employee Relations', slug: 'employee-relations' },
      { name: 'HR Analytics', slug: 'hr-analytics' },
    ],
  },
  {
    name: 'Safety and Compliance',
    slug: 'safety-and-compliance',
    icon: 'shield',
    sort_order: 6,
    subcategories: [
      { name: 'OSHA and Workplace Safety', slug: 'osha-and-workplace-safety' },
      { name: 'Environmental Compliance', slug: 'environmental-compliance' },
      { name: 'Quality Management (ISO)', slug: 'quality-management-iso' },
      { name: 'Food Safety (HACCP)', slug: 'food-safety-haccp' },
      { name: 'Fire Safety', slug: 'fire-safety' },
    ],
  },
  {
    name: 'Manufacturing and Operations',
    slug: 'manufacturing-and-operations',
    icon: 'settings',
    sort_order: 7,
    subcategories: [
      { name: 'Lean Manufacturing', slug: 'lean-manufacturing' },
      { name: 'Six Sigma', slug: 'six-sigma' },
      { name: 'Supply Chain Management', slug: 'supply-chain-management' },
      { name: 'Industry 4.0', slug: 'industry-4-0' },
      { name: 'Maintenance and Reliability', slug: 'maintenance-and-reliability' },
    ],
  },
  {
    name: 'Communication and Soft Skills',
    slug: 'communication-and-soft-skills',
    icon: 'message-circle',
    sort_order: 8,
    subcategories: [
      { name: 'Business Communication', slug: 'business-communication' },
      { name: 'Presentation Skills', slug: 'presentation-skills' },
      { name: 'Negotiation Skills', slug: 'negotiation-skills' },
      { name: 'Emotional Intelligence', slug: 'emotional-intelligence' },
      { name: 'Time Management', slug: 'time-management' },
    ],
  },
  {
    name: 'Office Productivity',
    slug: 'office-productivity',
    icon: 'file-text',
    sort_order: 9,
    subcategories: [
      { name: 'Microsoft Excel', slug: 'microsoft-excel' },
      { name: 'Microsoft Power BI', slug: 'microsoft-power-bi' },
      { name: 'Google Workspace', slug: 'google-workspace' },
      { name: 'Project Management Tools', slug: 'project-management-tools' },
    ],
  },
  {
    name: 'ESG and Sustainability',
    slug: 'esg-and-sustainability',
    icon: 'leaf',
    sort_order: 10,
    subcategories: [
      { name: 'ESG Reporting', slug: 'esg-reporting' },
      { name: 'Carbon Management', slug: 'carbon-management' },
      { name: 'Sustainable Business Practices', slug: 'sustainable-business-practices' },
    ],
  },
];

export async function seedCategories(prisma: PrismaClient) {
  console.log('Seeding categories...');

  for (const cat of categories) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sort_order: cat.sort_order },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        sort_order: cat.sort_order,
      },
    });

    for (const sub of cat.subcategories) {
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: { name: sub.name, parent_id: parent.category_id },
        create: {
          name: sub.name,
          slug: sub.slug,
          parent_id: parent.category_id,
        },
      });
    }
  }

  console.log(`  Created ${categories.length} categories with subcategories`);
}
