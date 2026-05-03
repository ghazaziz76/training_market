import type { PrismaClient } from '@prisma/client';

export async function seedPrograms(prisma: PrismaClient) {
  console.log('Seeding training programs...');

  const provider = await prisma.trainingProvider.findFirst({
    where: { provider_name: 'Excel Training Academy Sdn Bhd' },
  });

  if (!provider) {
    console.log('  Skipping programs — no provider found');
    return;
  }

  const leadershipCat = await prisma.category.findUnique({ where: { slug: 'strategic-leadership' } });
  const salesCat = await prisma.category.findUnique({ where: { slug: 'sales-techniques' } });
  const safetyCat = await prisma.category.findUnique({ where: { slug: 'osha-and-workplace-safety' } });
  const excelCat = await prisma.category.findUnique({ where: { slug: 'microsoft-excel' } });
  const leanCat = await prisma.category.findUnique({ where: { slug: 'lean-manufacturing' } });

  const programs = [
    {
      title: 'Advanced Strategic Leadership Masterclass',
      slug: 'advanced-strategic-leadership-masterclass',
      category_id: leadershipCat?.category_id,
      description:
        'This intensive 3-day programme equips senior managers with the strategic thinking, decision-making, and leadership skills needed to drive organizational success. Through case studies, simulations, and peer learning, participants develop practical strategies they can implement immediately.',
      objective:
        '- Apply strategic thinking frameworks to real business challenges\n- Lead organizational change with confidence\n- Build and sustain high-performance teams\n- Make data-informed decisions under uncertainty\n- Develop personal leadership action plans',
      target_group: 'Senior managers, department heads, and directors with 5+ years management experience',
      duration_hours: 24,
      duration_days: 3,
      program_type: 'both',
      fee_per_pax: 1500,
      fee_per_group: 25000,
      min_group_size: 10,
      max_group_size: 25,
      early_bird_fee: 1200,
      agenda: [
        {
          day: 1,
          title: 'Strategic Foundations',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Introduction to Strategic Leadership', description: 'Understanding the strategic leadership landscape and self-assessment' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Leadership Styles & Assessment', description: 'Identifying your leadership style and adapting to different situations' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Strategic Planning Frameworks', description: 'SWOT, PESTLE, Blue Ocean Strategy applied to real scenarios' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Workshop: Strategic Vision', description: 'Develop a strategic vision statement for your department' },
          ],
        },
        {
          day: 2,
          title: 'Leading People & Change',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Building High-Performance Teams', description: 'Team dynamics, motivation, and performance management' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Leading Through Change', description: 'Change management models and overcoming resistance' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Stakeholder Management', description: 'Mapping and engaging key stakeholders effectively' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Case Study: Transformation', description: 'Analyse a real organizational transformation case' },
          ],
        },
        {
          day: 3,
          title: 'Decision Making & Action Planning',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Decision Making Under Uncertainty', description: 'Data-driven decision frameworks and cognitive biases' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Communication & Influence', description: 'Executive communication and influencing without authority' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Personal Leadership Action Plan', description: 'Create your 90-day leadership action plan' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Presentations & Closing', description: 'Present action plans, peer feedback, certificates' },
          ],
        },
      ],
      short_description: 'Develop strategic leadership capabilities for senior managers in manufacturing and services sectors.',
      industry_focus: ['Manufacturing', 'Services', 'Technology'],
      delivery_mode: 'physical',
      location: 'Kuala Lumpur',
      city: 'Kuala Lumpur',
      state: 'Kuala Lumpur',
      min_participants: 10,
      max_participants: 25,
      is_certification: true,
      certification_name: 'Certificate of Completion',
      hrd_corp_claimable: true,
      hrd_corp_scheme: 'SBL_KHAS',
      status: 'published',
      published_at: new Date(),
    },
    {
      title: 'Sales Closing Mastery Workshop',
      slug: 'sales-closing-mastery-workshop',
      category_id: salesCat?.category_id,
      description:
        'This hands-on 2-day workshop teaches sales professionals the psychology of closing and practical techniques to increase conversion rates. Includes role-playing, live demos, and personalized feedback sessions.',
      objective:
        '- Master 7 proven closing techniques\n- Handle objections with confidence\n- Build value propositions that resonate\n- Develop a systematic follow-up process\n- Increase personal closing rate by 20-30%',
      target_group: 'Sales executives, business development managers, account managers',
      duration_hours: 16,
      duration_days: 2,
      program_type: 'both',
      fee_per_pax: 1200,
      fee_per_group: 18000,
      min_group_size: 10,
      max_group_size: 30,
      agenda: [
        {
          day: 1,
          title: 'Psychology of Selling',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Buyer Psychology & Decision Triggers', description: 'Understanding how buyers make decisions and what triggers action' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Value-Based Selling', description: 'Building compelling value propositions that differentiate you' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Objection Handling Mastery', description: 'The LAER framework for handling any objection' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Role-Play: Objection Handling', description: 'Practice sessions with peer and trainer feedback' },
          ],
        },
        {
          day: 2,
          title: 'Closing Techniques & Action',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: '7 Proven Closing Techniques', description: 'Assumptive, urgency, summary, question, alternative, and more' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Negotiation & Win-Win Deals', description: 'Negotiation tactics that protect margins while keeping clients happy' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Follow-Up Systems', description: 'Building a systematic follow-up process that converts' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Live Closing Simulation', description: 'Full sales scenario simulation with scoring and feedback' },
          ],
        },
      ],
      short_description: 'Master proven closing techniques to convert prospects into loyal customers.',
      industry_focus: ['All Industries'],
      delivery_mode: 'physical',
      location: 'Kuala Lumpur',
      city: 'Kuala Lumpur',
      state: 'Kuala Lumpur',
      min_participants: 10,
      max_participants: 30,
      is_certification: true,
      certification_name: 'Certificate of Completion',
      hrd_corp_claimable: true,
      hrd_corp_scheme: 'SBL_KHAS',
      status: 'published',
      published_at: new Date(),
    },
    {
      title: 'OSHA Safety Compliance and Risk Management',
      slug: 'osha-safety-compliance-and-risk-management',
      category_id: safetyCat?.category_id,
      description:
        'This 2-day programme provides a thorough understanding of OSHA requirements for Malaysian workplaces. Participants learn to identify hazards, conduct risk assessments, develop safety procedures, and build a safety culture.',
      objective:
        '- Understand OSHA Act 1994 requirements\n- Conduct workplace hazard identification\n- Perform risk assessments using HIRARC methodology\n- Develop emergency response procedures\n- Lead safety audits and inspections',
      target_group: 'Safety officers, operations managers, supervisors, HR managers',
      duration_hours: 16,
      duration_days: 2,
      program_type: 'in_house',
      fee_per_group: 12000,
      min_group_size: 15,
      max_group_size: 40,
      agenda: [
        {
          day: 1,
          title: 'OSHA Fundamentals & Hazard Identification',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'OSHA Act 1994 Overview', description: 'Legal requirements, employer obligations, penalties' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Workplace Hazard Identification', description: 'Types of hazards: physical, chemical, biological, ergonomic' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'HIRARC Methodology', description: 'Hazard Identification, Risk Assessment, and Risk Control' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Workshop: Risk Assessment', description: 'Conduct a risk assessment on sample workplace scenarios' },
          ],
        },
        {
          day: 2,
          title: 'Emergency Response & Safety Audits',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Emergency Response Planning', description: 'Developing and testing emergency response procedures' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Incident Investigation', description: 'Root cause analysis and corrective action planning' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Safety Audit Techniques', description: 'Planning and conducting effective safety audits' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Building a Safety Culture', description: 'Leadership commitment, employee engagement, continuous improvement' },
          ],
        },
      ],
      short_description: 'Comprehensive workplace safety programme covering OSHA requirements and practical risk management.',
      industry_focus: ['Manufacturing', 'Construction', 'Oil and Gas'],
      delivery_mode: 'physical',
      location: 'Client premises',
      city: 'Kuala Lumpur',
      state: 'Kuala Lumpur',
      is_certification: true,
      certification_name: 'OSHA Awareness Certificate',
      hrd_corp_claimable: true,
      hrd_corp_scheme: 'SBL_KHAS',
      status: 'published',
      published_at: new Date(),
    },
    {
      title: 'Advanced Excel for Business Analytics',
      slug: 'advanced-excel-for-business-analytics',
      category_id: excelCat?.category_id,
      description:
        'Take your Excel skills to the next level with this intensive 2-day programme. Learn advanced formulas, pivot tables, Power Query, dynamic dashboards, and data visualization techniques used by top analysts.',
      objective:
        '- Master advanced formulas (INDEX-MATCH, array formulas, dynamic arrays)\n- Build interactive dashboards with slicers and charts\n- Use Power Query for data transformation\n- Create automated reports\n- Apply data analysis techniques for business insights',
      target_group: 'Finance staff, analysts, managers, anyone who uses Excel regularly',
      duration_hours: 16,
      duration_days: 2,
      program_type: 'public',
      fee_per_pax: 900,
      early_bird_fee: 750,
      agenda: [
        {
          day: 1,
          title: 'Advanced Formulas & Data Management',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Advanced Lookup Functions', description: 'INDEX-MATCH, XLOOKUP, nested formulas' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Array Formulas & Dynamic Arrays', description: 'FILTER, SORT, UNIQUE, SEQUENCE and spill ranges' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Power Query Fundamentals', description: 'Importing, cleaning, and transforming data from multiple sources' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Hands-On: Data Cleanup Project', description: 'Clean and structure a messy real-world dataset' },
          ],
        },
        {
          day: 2,
          title: 'Dashboards & Reporting',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Pivot Tables Mastery', description: 'Multi-level pivots, calculated fields, grouping' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Interactive Dashboard Design', description: 'Slicers, timelines, dynamic charts, and layout principles' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Automated Reporting', description: 'Macros basics, auto-refresh, and scheduled reports' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Capstone: Build Your Dashboard', description: 'Build a complete analytics dashboard from raw data' },
          ],
        },
      ],
      short_description: 'Master advanced Excel functions, pivot tables, dashboards, and data analysis for business decision making.',
      industry_focus: ['All Industries'],
      delivery_mode: 'hybrid',
      location: 'Kuala Lumpur / Online',
      city: 'Kuala Lumpur',
      state: 'Kuala Lumpur',
      min_participants: 10,
      max_participants: 20,
      fee_notes: '10% discount for 5+ participants from the same company',
      is_certification: true,
      certification_name: 'Certificate of Completion',
      hrd_corp_claimable: true,
      hrd_corp_scheme: 'SBL_KHAS',
      status: 'published',
      published_at: new Date(),
    },
    {
      title: 'Lean Manufacturing and Continuous Improvement',
      slug: 'lean-manufacturing-and-continuous-improvement',
      category_id: leanCat?.category_id,
      description:
        'This 3-day programme teaches the principles and tools of lean manufacturing. Participants learn to identify and eliminate the 8 wastes, implement 5S, create value stream maps, and lead Kaizen events. Includes factory simulation exercises.',
      objective:
        '- Understand lean philosophy and principles\n- Identify and eliminate the 8 wastes\n- Implement 5S workplace organization\n- Create value stream maps\n- Plan and lead Kaizen improvement events',
      target_group: 'Manufacturing managers, operations supervisors, quality engineers, process improvement leads',
      duration_hours: 24,
      duration_days: 3,
      program_type: 'both',
      fee_per_pax: 1800,
      fee_per_group: 30000,
      min_group_size: 12,
      max_group_size: 25,
      early_bird_fee: 1500,
      agenda: [
        {
          day: 1,
          title: 'Lean Foundations & Waste Identification',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Introduction to Lean Thinking', description: 'History, philosophy, Toyota Production System principles' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'The 8 Wastes (TIMWOODS)', description: 'Identifying Transport, Inventory, Motion, Waiting, Overproduction, Overprocessing, Defects, Skills waste' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: '5S Workplace Organization', description: 'Sort, Set in Order, Shine, Standardize, Sustain — implementation guide' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Factory Simulation Round 1', description: 'Simulate a production line and identify wastes' },
          ],
        },
        {
          day: 2,
          title: 'Value Stream Mapping & Flow',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Value Stream Mapping (Current State)', description: 'Map the current state of a production process end-to-end' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Designing Future State', description: 'Redesign the value stream for improved flow and reduced waste' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Pull Systems & Kanban', description: 'Implementing pull-based production and visual management' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Factory Simulation Round 2', description: 'Apply lean improvements and measure results' },
          ],
        },
        {
          day: 3,
          title: 'Kaizen & Continuous Improvement',
          slots: [
            { start_time: '9:00 AM', end_time: '10:30 AM', module_title: 'Kaizen Events — Planning', description: 'How to plan, scope, and resource a Kaizen event' },
            { start_time: '10:30 AM', end_time: '10:45 AM', module_title: 'Break', description: '' },
            { start_time: '10:45 AM', end_time: '12:30 PM', module_title: 'Kaizen Events — Execution', description: 'Running the event: team facilitation, root cause analysis, countermeasures' },
            { start_time: '12:30 PM', end_time: '2:00 PM', module_title: 'Lunch', description: '' },
            { start_time: '2:00 PM', end_time: '3:30 PM', module_title: 'Sustaining Improvements', description: 'Standardization, visual management, and daily management systems' },
            { start_time: '3:30 PM', end_time: '5:00 PM', module_title: 'Action Plan & Closing', description: 'Create your workplace Kaizen project plan, presentations, certificates' },
          ],
        },
      ],
      short_description: 'Implement lean principles to eliminate waste, improve efficiency, and drive continuous improvement.',
      industry_focus: ['Manufacturing', 'Logistics'],
      delivery_mode: 'physical',
      location: 'Shah Alam',
      city: 'Shah Alam',
      state: 'Selangor',
      min_participants: 12,
      max_participants: 25,
      is_certification: true,
      certification_name: 'Lean Practitioner Certificate',
      hrd_corp_claimable: true,
      hrd_corp_scheme: 'SBL_KHAS',
      status: 'published',
      published_at: new Date(),
    },
  ];

  for (const prog of programs) {
    if (!prog.category_id) continue;

    await prisma.trainingProgram.upsert({
      where: { slug: prog.slug },
      update: {},
      create: {
        provider_id: provider.provider_id,
        ...prog,
      },
    });
  }

  console.log(`  Created ${programs.length} training programs`);
}
