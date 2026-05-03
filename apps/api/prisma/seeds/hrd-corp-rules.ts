import type { PrismaClient } from '@prisma/client';

export async function seedHrdCorpRules(prisma: PrismaClient) {
  console.log('Seeding HRD Corp guidance rules...');

  await prisma.hrdCorpGuidanceRule.upsert({
    where: { scheme_code: 'SBL_KHAS' },
    update: {},
    create: {
      scheme_name: 'SBL-Khas Scheme',
      scheme_code: 'SBL_KHAS',
      description: 'Skim Bantuan Latihan Khas — for external training programmes conducted by external training providers',
      eligibility_criteria: [
        { item: 'Employer must be registered with HRD Corp', type: 'employer' },
        { item: 'Employer levy account must be active', type: 'employer' },
        { item: 'Training provider should be registered with HRD Corp', type: 'provider' },
        { item: 'Training program should be relevant to employer business operations', type: 'program' },
        { item: 'Application must be submitted before training starts', type: 'process' },
      ],
      required_documents: [
        { item: 'Training provider quotation or invoice', source: 'provider', mandatory: true },
        { item: 'Training program details and objectives', source: 'provider', mandatory: true },
        { item: 'Trainer profile and qualifications', source: 'provider', mandatory: true },
        { item: 'Training schedule with dates and duration', source: 'provider', mandatory: true },
        { item: 'Fee breakdown per participant', source: 'provider', mandatory: true },
        { item: 'List of participants with IC numbers', source: 'employer', mandatory: true },
        { item: 'Company registration documents', source: 'employer', mandatory: false },
      ],
      process_steps: [
        { step: 1, title: 'Identify training need', description: 'Determine what training your team needs based on skill gaps or business requirements' },
        { step: 2, title: 'Find suitable training program', description: 'Search and compare programs on Training Market or receive AI recommendations' },
        { step: 3, title: 'Obtain quotation from provider', description: 'Request and receive quotation with full program details and fee breakdown' },
        { step: 4, title: 'Prepare application documents', description: 'Collect all required documents from the checklist below' },
        { step: 5, title: 'Submit application via e-TRIS', description: 'Log in to HRD Corp e-TRIS system and submit the grant application' },
        { step: 6, title: 'Await approval', description: 'HRD Corp reviews and approves the application (typically 5-10 working days)' },
        { step: 7, title: 'Attend training', description: 'Employees attend the approved training programme' },
        { step: 8, title: 'Submit claim', description: 'After training completion, submit claim with attendance and completion proof within 60 days' },
      ],
      useful_links: [
        { label: 'HRD Corp e-TRIS Portal', url: 'https://etris.hrdcorp.gov.my' },
        { label: 'SBL-Khas Scheme Guidelines', url: 'https://hrdcorp.gov.my/schemes/sbl-khas' },
        { label: 'HRD Corp Contact', url: 'https://hrdcorp.gov.my/contact' },
      ],
      notes: 'Application must be submitted at least 5 working days before training date. Claims must be submitted within 60 days of training completion.',
    },
  });

  await prisma.hrdCorpGuidanceRule.upsert({
    where: { scheme_code: 'SBL' },
    update: {},
    create: {
      scheme_name: 'SBL Scheme',
      scheme_code: 'SBL',
      description: 'Skim Bantuan Latihan — for in-house training programmes conducted by in-house or external trainers',
      eligibility_criteria: [
        { item: 'Employer must be registered with HRD Corp', type: 'employer' },
        { item: 'Employer levy account must be active', type: 'employer' },
        { item: 'Training programme must be relevant to employer operations', type: 'program' },
        { item: 'Minimum training duration of 4 hours', type: 'program' },
      ],
      required_documents: [
        { item: 'Training programme outline and objectives', source: 'provider', mandatory: true },
        { item: 'Trainer profile and qualifications', source: 'provider', mandatory: true },
        { item: 'Training schedule', source: 'provider', mandatory: true },
        { item: 'Cost breakdown', source: 'provider', mandatory: true },
        { item: 'List of participants', source: 'employer', mandatory: true },
      ],
      process_steps: [
        { step: 1, title: 'Plan training programme', description: 'Determine training needs and programme details' },
        { step: 2, title: 'Prepare programme outline', description: 'Prepare detailed programme outline with learning objectives' },
        { step: 3, title: 'Submit application via e-TRIS', description: 'Submit at least 5 working days before training date' },
        { step: 4, title: 'Await approval', description: 'HRD Corp reviews the application' },
        { step: 5, title: 'Conduct training', description: 'Run the approved training programme' },
        { step: 6, title: 'Submit claim', description: 'Submit claim within 60 days of completion' },
      ],
      useful_links: [
        { label: 'HRD Corp e-TRIS Portal', url: 'https://etris.hrdcorp.gov.my' },
        { label: 'SBL Scheme Guidelines', url: 'https://hrdcorp.gov.my/schemes/sbl' },
      ],
      notes: 'In-house programmes may have different reimbursement rates than external programmes.',
    },
  });

  console.log('  Created 2 HRD Corp guidance rules');
}
