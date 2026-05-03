/**
 * HRD Corp Allowable Cost Matrix (ACM) Calculator
 * Based on HRD Corp ACM August 2025 specification
 */

export interface CalculatorInput {
  training_type: 'in_house' | 'local_public' | 'overseas_training' | 'overseas_seminar' | 'e_learning' | 'remote_online';
  trainer_type: 'internal' | 'external' | 'overseas';
  training_venue: 'employer_premises' | 'external_premises';
  course_category: 'general' | 'focus_area' | 'industry_specific' | 'professional_certification';
  duration_type: 'full_day' | 'half_day' | 'custom_hours';
  custom_hours?: number;
  number_of_days: number;
  pax: number;
  travel_distance: 'under_100km' | 'over_100km' | 'not_applicable';
  course_fee_charged?: number;
  air_ticket_cost?: number;
  chartered_transport_cost?: number;
  consumable_materials_cost?: number;
  allowance_type: 'meal' | 'trainee';
}

export interface CostItem {
  item: string;
  eligible: boolean;
  reason: string;
  max_claimable: number;
  calculation: string;
  required_documents: string[];
}

export interface CalculatorResult {
  input_summary: {
    training_type: string;
    trainer_type: string;
    venue: string;
    course_category: string;
    duration: string;
    pax: number;
    days: number;
  };
  cost_items: CostItem[];
  total_claimable: number;
  financial_assistance_rate: number;
  net_claimable: number;
  notes: string[];
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  in_house: 'In-House (Face-to-Face)',
  local_public: 'Local Public Training / Seminar / Conference',
  overseas_training: 'Overseas Training',
  overseas_seminar: 'Overseas Seminar / Conference',
  e_learning: 'E-Learning',
  remote_online: 'Remote Online Training (ROT)',
};

function getHoursForDuration(input: CalculatorInput): number {
  if (input.duration_type === 'full_day') return 7;
  if (input.duration_type === 'half_day') return 4;
  return input.custom_hours || 1;
}

function getProrateMultiplier(pax: number): number {
  return pax >= 5 ? 1 : pax / 5;
}

export function calculateGrant(input: CalculatorInput): CalculatorResult {
  const items: CostItem[] = [];
  const notes: string[] = [];
  const hours = getHoursForDuration(input);
  const days = input.number_of_days;
  const pax = input.pax;
  const prorate = getProrateMultiplier(pax);

  // Determine financial assistance rate
  let financialAssistanceRate = 1.0; // 100% for most local training
  if (input.training_type === 'overseas_training' || input.training_type === 'overseas_seminar') {
    financialAssistanceRate = 0.5; // 50% for overseas
  }

  // A. Internal Trainer Allowance
  const internalTrainerEligible =
    input.trainer_type === 'internal' &&
    input.training_type === 'in_house' &&
    (input.training_venue === 'employer_premises' || input.training_venue === 'external_premises');

  if (internalTrainerEligible) {
    const dailyRate = input.duration_type === 'half_day' ? 800 : 1400;
    const amount = dailyRate * days * prorate;
    items.push({
      item: 'Internal Trainer Allowance',
      eligible: true,
      reason: 'Internal trainer conducting in-house face-to-face training',
      max_claimable: amount,
      calculation: `RM${dailyRate.toLocaleString()} × ${days} day(s)${prorate < 1 ? ` × ${(prorate * 100).toFixed(0)}% (prorated, <5 pax)` : ''}`,
      required_documents: ['Trainer appointment letter', 'Training attendance record', 'Trainer CV/profile'],
    });
  } else {
    items.push({
      item: 'Internal Trainer Allowance',
      eligible: false,
      reason: input.trainer_type !== 'internal'
        ? 'Only applicable for internal trainers'
        : 'Only applicable for in-house face-to-face training',
      max_claimable: 0,
      calculation: 'N/A',
      required_documents: [],
    });
  }

  // B. Course Fee
  if (input.training_type === 'in_house' || input.training_type === 'local_public' || input.training_type === 'remote_online') {
    let courseFee = 0;
    let calculation = '';

    if (input.course_category === 'general') {
      const dailyRate = input.duration_type === 'half_day' ? 6000 : 10500;
      courseFee = dailyRate * days * prorate;
      calculation = `RM${dailyRate.toLocaleString()} × ${days} day(s)${prorate < 1 ? ` × ${(prorate * 100).toFixed(0)}% (prorated)` : ''}`;
    } else {
      // focus_area, industry_specific, professional_certification: "as charged" per pax
      const chargedFee = input.course_fee_charged || 10000;
      courseFee = chargedFee * pax * days;
      calculation = `RM${chargedFee.toLocaleString()} × ${pax} pax × ${days} day(s) (as charged)`;
    }

    items.push({
      item: 'Course Fee',
      eligible: true,
      reason: `${input.course_category.replace('_', ' ')} course — ${input.course_category === 'general' ? 'fixed rate per group' : 'as charged per pax'}`,
      max_claimable: courseFee,
      calculation,
      required_documents: ['Official invoice from training provider', 'Course brochure/outline', 'Payment receipt'],
    });
  } else if (input.training_type === 'overseas_training' || input.training_type === 'overseas_seminar') {
    const chargedFee = input.course_fee_charged || 10000;
    const courseFee = chargedFee * pax;
    items.push({
      item: 'Course Fee',
      eligible: true,
      reason: 'Overseas course fee — as charged (converted to RM)',
      max_claimable: courseFee,
      calculation: `RM${chargedFee.toLocaleString()} × ${pax} pax (as charged, convert to RM)`,
      required_documents: ['Official invoice (with RM conversion)', 'Course confirmation letter', 'Payment receipt'],
    });
  } else if (input.training_type === 'e_learning') {
    // E-learning special rates
    const ratePerHour = 125;
    const clampedHours = Math.min(hours, 7);
    const eLearningFee = ratePerHour * clampedHours * pax;
    items.push({
      item: 'Course Fee (E-Learning)',
      eligible: true,
      reason: `E-Learning: RM${ratePerHour}/hour/pax, max 7 hours`,
      max_claimable: eLearningFee,
      calculation: `RM${ratePerHour} × ${clampedHours} hour(s) × ${pax} pax`,
      required_documents: ['E-learning platform access proof', 'Completion certificate', 'Invoice'],
    });
  }

  // C. Allowance for Trainees / Trainers (daily allowance based on distance)
  const allowanceEligible = hours >= 4 && input.travel_distance !== 'not_applicable';
  if (allowanceEligible && input.allowance_type === 'trainee') {
    const dailyRate = input.travel_distance === 'over_100km' ? 500 : 250;
    const amount = dailyRate * days * pax;
    items.push({
      item: 'Trainee/Trainer Allowance',
      eligible: true,
      reason: `Travel distance ${input.travel_distance === 'over_100km' ? '>=100km' : '<100km'}, minimum 4 hours met`,
      max_claimable: amount,
      calculation: `RM${dailyRate} × ${days} day(s) × ${pax} pax`,
      required_documents: ['Attendance record', 'Travel claim form'],
    });
  } else {
    items.push({
      item: 'Trainee/Trainer Allowance',
      eligible: false,
      reason: !allowanceEligible
        ? hours < 4 ? 'Minimum 4 hours required' : 'No travel distance applicable'
        : 'Meal allowance selected instead',
      max_claimable: 0,
      calculation: 'N/A',
      required_documents: [],
    });
  }

  // D. Meal Allowance
  if (allowanceEligible && input.allowance_type === 'meal') {
    const mealRate = 100;
    const amount = mealRate * days * pax;
    items.push({
      item: 'Meal Allowance',
      eligible: true,
      reason: 'Minimum 4 hours met. Note: Only ONE allowance type (Meal OR Trainee) allowed.',
      max_claimable: amount,
      calculation: `RM${mealRate} × ${days} day(s) × ${pax} pax`,
      required_documents: ['Attendance record', 'Meal receipt/claim form'],
    });
  } else {
    items.push({
      item: 'Meal Allowance',
      eligible: false,
      reason: !allowanceEligible
        ? hours < 4 ? 'Minimum 4 hours required' : 'No travel distance applicable'
        : 'Trainee allowance selected instead',
      max_claimable: 0,
      calculation: 'N/A',
      required_documents: [],
    });
  }

  // E. Overseas Trainer Daily Allowance
  if (input.trainer_type === 'overseas') {
    const overseasRate = 500;
    const amount = overseasRate * days;
    items.push({
      item: 'Overseas Trainer Daily Allowance',
      eligible: true,
      reason: 'Overseas trainer engaged',
      max_claimable: amount,
      calculation: `RM${overseasRate} × ${days} day(s)`,
      required_documents: ['Trainer passport copy', 'Trainer engagement letter', 'Attendance record'],
    });
  } else {
    items.push({
      item: 'Overseas Trainer Daily Allowance',
      eligible: false,
      reason: 'Only applicable for overseas trainers',
      max_claimable: 0,
      calculation: 'N/A',
      required_documents: [],
    });
  }

  // F. Air Ticket
  const airTicketCost = input.air_ticket_cost || 0;
  if (airTicketCost > 0) {
    items.push({
      item: 'Air Ticket',
      eligible: true,
      reason: 'Applicable for trainees, internal/external/overseas trainers',
      max_claimable: airTicketCost,
      calculation: `RM${airTicketCost.toLocaleString()} (actual airfare)`,
      required_documents: ['Boarding pass', 'E-ticket/invoice', 'Payment receipt'],
    });
  } else {
    items.push({
      item: 'Air Ticket',
      eligible: false,
      reason: 'No air ticket cost provided',
      max_claimable: 0,
      calculation: 'N/A',
      required_documents: [],
    });
  }

  // G. Chartered Transportation
  const transportCost = input.chartered_transport_cost || 0;
  if (transportCost > 0) {
    items.push({
      item: 'Chartered Transportation',
      eligible: true,
      reason: 'As per quotation',
      max_claimable: transportCost,
      calculation: `RM${transportCost.toLocaleString()} (per quotation)`,
      required_documents: ['Transport quotation', 'Invoice', 'Payment receipt'],
    });
  } else {
    items.push({
      item: 'Chartered Transportation',
      eligible: false,
      reason: 'No chartered transport cost provided',
      max_claimable: 0,
      calculation: 'N/A',
      required_documents: [],
    });
  }

  // H. Consumable Training Materials
  const materialsCost = input.consumable_materials_cost || 0;
  if (materialsCost > 0 || input.training_type === 'in_house') {
    const amount = materialsCost > 0 ? materialsCost : 100;
    items.push({
      item: 'Consumable Training Materials',
      eligible: true,
      reason: amount <= 100 ? 'RM100 per group without quotation' : 'Itemised invoice required for >RM100',
      max_claimable: amount,
      calculation: amount <= 100
        ? 'RM100 per group (no quotation needed)'
        : `RM${amount.toLocaleString()} (itemised invoice required)`,
      required_documents: amount > 100
        ? ['Itemised invoice', 'Payment receipt']
        : ['Self-declaration or receipt'],
    });
  } else {
    items.push({
      item: 'Consumable Training Materials',
      eligible: false,
      reason: 'No materials cost provided',
      max_claimable: 0,
      calculation: 'N/A',
      required_documents: [],
    });
  }

  // Overseas daily allowance for trainees
  if (input.training_type === 'overseas_training' || input.training_type === 'overseas_seminar') {
    const overseasDailyRate = 1500;
    const extraDays = 2; // up to 2 extra days allowed
    const totalDays = days + extraDays;
    const amount = overseasDailyRate * totalDays * pax;
    items.push({
      item: 'Overseas Daily Allowance (Trainees)',
      eligible: true,
      reason: `RM1,500/day/pax, up to ${extraDays} extra days allowed`,
      max_claimable: amount,
      calculation: `RM${overseasDailyRate.toLocaleString()} × ${totalDays} days (${days} training + ${extraDays} travel) × ${pax} pax`,
      required_documents: ['Passport with immigration stamps', 'Travel itinerary', 'Attendance record'],
    });

    notes.push('Overseas training is subject to 50% financial assistance rate.');
  }

  // Validation notes
  notes.push('Attendance must be >= 75% for claims to be valid.');
  if (hours < 4) {
    notes.push('Warning: Training duration is less than 4 hours — some allowances are not eligible.');
  }
  if (input.allowance_type === 'meal') {
    notes.push('Only ONE allowance type is allowed: Meal Allowance was selected (Trainee Allowance excluded).');
  } else {
    notes.push('Only ONE allowance type is allowed: Trainee Allowance was selected (Meal Allowance excluded).');
  }
  if (pax < 5 && input.course_category === 'general') {
    notes.push(`Prorated at ${(prorate * 100).toFixed(0)}% because fewer than 5 trainees.`);
  }

  const totalClaimable = items
    .filter((i) => i.eligible)
    .reduce((sum, i) => sum + i.max_claimable, 0);

  const netClaimable = Math.round(totalClaimable * financialAssistanceRate);

  const durationLabel =
    input.duration_type === 'custom_hours'
      ? `${hours} hour(s)`
      : input.duration_type === 'full_day'
        ? 'Full Day (7 hours)'
        : 'Half Day (4 hours)';

  return {
    input_summary: {
      training_type: TRAINING_TYPE_LABELS[input.training_type] || input.training_type,
      trainer_type: input.trainer_type,
      venue: input.training_venue.replace('_', ' '),
      course_category: input.course_category.replace('_', ' '),
      duration: `${durationLabel} × ${days} day(s)`,
      pax,
      days,
    },
    cost_items: items,
    total_claimable: totalClaimable,
    financial_assistance_rate: financialAssistanceRate * 100,
    net_claimable: netClaimable,
    notes,
  };
}
