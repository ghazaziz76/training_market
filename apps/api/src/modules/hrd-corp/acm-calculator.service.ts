/**
 * HRD Corp Allowable Cost Matrix (ACM) Calculator
 * Based on HRD Corp ACM August 2025
 */

export type TrainingType = 'in_house' | 'public_local' | 'overseas_training' | 'overseas_conference' | 'e_learning' | 'remote_online';
export type TrainerType = 'internal' | 'external' | 'overseas';
export type VenueType = 'employer_premises' | 'external_premises';
export type CourseCategory = 'general' | 'focus_area' | 'industry_specific' | 'professional_certification';
export type DurationType = 'full_day' | 'half_day';
export type TravelDistance = 'under_100km' | 'over_100km';
export type AllowanceType = 'meal' | 'trainee';

export interface AcmInput {
  training_type: TrainingType;
  trainer_type: TrainerType;
  venue: VenueType;
  course_category: CourseCategory;
  duration_type: DurationType;
  num_days: number;
  num_trainees: number;
  course_fee_actual?: number;
  travel_distance?: TravelDistance;
  allowance_type?: AllowanceType;
  air_ticket_cost?: number;
  transport_cost?: number;
  materials_cost?: number;
  e_learning_hours?: number;
  overseas_extra_days?: number;
}

export interface CostItem {
  item: string;
  eligible: boolean;
  amount: number;
  calculation: string;
  documents_required: string[];
  notes?: string;
}

export interface AcmResult {
  cost_items: CostItem[];
  total_claimable: number;
  financial_assistance_rate: number;
  net_claimable: number;
  summary: string;
}

const AS_PER_CHARGE_DEFAULT = 10000;

function prorateIfUnder5(amount: number, pax: number): { value: number; prorated: boolean } {
  if (pax >= 5) return { value: amount, prorated: false };
  const prorated = Math.round((amount / 5) * pax * 100) / 100;
  return { value: prorated, prorated: true };
}

export function calculateAcm(input: AcmInput): AcmResult {
  const items: CostItem[] = [];
  const days = input.num_days;
  const pax = input.num_trainees;
  const isHalfDay = input.duration_type === 'half_day';

  // ============================================================
  // E-LEARNING
  // ============================================================
  if (input.training_type === 'e_learning') {
    const hours = Math.min(input.e_learning_hours || 1, 7);
    const perPax = hours * 125;
    const total = perPax * pax;
    items.push({
      item: 'E-Learning Financial Assistance',
      eligible: true,
      amount: total,
      calculation: `RM125/hour x ${hours} hours x ${pax} pax = RM ${total.toLocaleString()}`,
      documents_required: ['E-learning platform access records', 'Completion certificate', 'Payment receipt'],
    });

    return {
      cost_items: items,
      total_claimable: total,
      financial_assistance_rate: 100,
      net_claimable: total,
      summary: `E-Learning: ${hours} hours, ${pax} pax. Max claimable: RM ${total.toLocaleString()}`,
    };
  }

  // ============================================================
  // OVERSEAS TRAINING / CONFERENCE
  // ============================================================
  if (input.training_type === 'overseas_training' || input.training_type === 'overseas_conference') {
    const courseFee = input.course_fee_actual || 0;
    if (courseFee > 0) {
      items.push({
        item: 'Course Fee (Overseas)',
        eligible: true,
        amount: courseFee,
        calculation: `As charged: RM ${courseFee.toLocaleString()} (converted to MYR)`,
        documents_required: ['Course fee invoice', 'Payment receipt', 'Currency conversion proof'],
      });
    }

    const extraDays = Math.min(input.overseas_extra_days || 0, 2);
    const allowanceDays = days + extraDays;
    const dailyAllowance = 1500 * allowanceDays * pax;
    items.push({
      item: 'Overseas Daily Allowance',
      eligible: true,
      amount: dailyAllowance,
      calculation: `RM1,500/day x ${allowanceDays} days${extraDays > 0 ? ` (${days} training + ${extraDays} travel)` : ''} x ${pax} pax`,
      documents_required: ['Travel itinerary', 'Boarding passes'],
    });

    const airTicket = input.air_ticket_cost || 0;
    if (airTicket > 0) {
      items.push({
        item: 'Air Ticket (Overseas)',
        eligible: true,
        amount: airTicket,
        calculation: `Actual airfare: RM ${airTicket.toLocaleString()}`,
        documents_required: ['Air ticket receipt', 'Boarding passes', 'E-ticket confirmation'],
      });
    }

    const total = items.reduce((s, i) => s + i.amount, 0);
    const rate = 50;
    const net = Math.round(total * rate / 100);
    return {
      cost_items: items,
      total_claimable: total,
      financial_assistance_rate: rate,
      net_claimable: net,
      summary: `Overseas: ${days} days, ${pax} pax. Total: RM ${total.toLocaleString()} at ${rate}% = RM ${net.toLocaleString()}`,
    };
  }

  // ============================================================
  // IN-HOUSE / PUBLIC LOCAL / REMOTE ONLINE
  // ============================================================

  // A. Internal Trainer Allowance
  if (input.trainer_type === 'internal' && input.training_type === 'in_house') {
    const ratePerDay = isHalfDay ? 800 : 1400;
    const base = ratePerDay * days;
    const { value, prorated } = prorateIfUnder5(base, pax);
    items.push({
      item: 'Internal Trainer Allowance',
      eligible: true,
      amount: value,
      calculation: `RM${ratePerDay.toLocaleString()}/${isHalfDay ? 'half day' : 'day'} x ${days} day(s)${prorated ? ` (prorated for ${pax} pax)` : ''}`,
      documents_required: ['Trainer appointment letter', 'Attendance record', 'Trainer CV/resume'],
      notes: prorated ? `Prorated: under 5 trainees (${pax} pax)` : undefined,
    });
  }

  // B. Course Fee
  if (input.training_type === 'in_house' || input.training_type === 'public_local') {
    if (input.course_category === 'general') {
      const ratePerDay = isHalfDay ? 6000 : 10500;
      const base = ratePerDay * days;
      const { value, prorated } = prorateIfUnder5(base, pax);
      items.push({
        item: 'Course Fee (General)',
        eligible: true,
        amount: value,
        calculation: `RM${ratePerDay.toLocaleString()}/${isHalfDay ? 'half day' : 'day'} x ${days} day(s)${prorated ? ` (prorated for ${pax} pax)` : ''}`,
        documents_required: ['Course fee invoice', 'Payment receipt', 'Course outline'],
        notes: prorated ? `Prorated: under 5 trainees (${pax} pax)` : undefined,
      });
    } else {
      // Focus Area / Industry Specific / Professional Certification — as charged, per pax
      const courseFee = input.course_fee_actual || AS_PER_CHARGE_DEFAULT;
      const total = courseFee * pax;
      const label = input.course_category === 'focus_area' ? 'Focus Area'
        : input.course_category === 'industry_specific' ? 'Industry Specific'
        : 'Professional Certification';
      items.push({
        item: `Course Fee (${label})`,
        eligible: true,
        amount: total,
        calculation: `RM${courseFee.toLocaleString()}/pax x ${pax} pax = RM ${total.toLocaleString()} (as charged, prorated on attendance)`,
        documents_required: ['Course fee invoice', 'Payment receipt', 'Course outline', 'Attendance record'],
        notes: 'Subject to proration based on actual attendance (min 75%)',
      });
    }
  }

  // C. Allowance for Trainees / Trainers (travel)
  if (input.travel_distance && input.allowance_type === 'trainee') {
    const ratePerDay = input.travel_distance === 'over_100km' ? 500 : 250;
    const total = ratePerDay * days * pax;
    items.push({
      item: 'Trainee Allowance (Travel)',
      eligible: true,
      amount: total,
      calculation: `RM${ratePerDay}/${input.travel_distance === 'over_100km' ? '≥100km' : '<100km'}/day x ${days} day(s) x ${pax} pax`,
      documents_required: ['Attendance record', 'Travel claim form'],
      notes: 'Minimum 4 hours training required',
    });
  }

  // D. Meal Allowance
  if (input.allowance_type === 'meal') {
    const total = 100 * days * pax;
    items.push({
      item: 'Meal Allowance',
      eligible: true,
      amount: total,
      calculation: `RM100/day x ${days} day(s) x ${pax} pax`,
      documents_required: ['Attendance record'],
      notes: 'Minimum 4 hours. Cannot claim both Meal and Trainee allowance.',
    });
  }

  // E. Overseas Trainer Daily Allowance
  if (input.trainer_type === 'overseas') {
    const total = 500 * days;
    items.push({
      item: 'Overseas Trainer Daily Allowance',
      eligible: true,
      amount: total,
      calculation: `RM500/day x ${days} day(s)`,
      documents_required: ['Trainer passport copy', 'Visa documentation', 'Travel itinerary'],
    });
  }

  // F. Air Ticket
  if (input.air_ticket_cost && input.air_ticket_cost > 0) {
    items.push({
      item: 'Air Ticket',
      eligible: true,
      amount: input.air_ticket_cost,
      calculation: `Actual airfare: RM ${input.air_ticket_cost.toLocaleString()}`,
      documents_required: ['Air ticket receipt', 'Boarding passes', 'E-ticket confirmation'],
    });
  }

  // G. Chartered Transportation
  if (input.transport_cost && input.transport_cost > 0) {
    items.push({
      item: 'Chartered Transportation',
      eligible: true,
      amount: input.transport_cost,
      calculation: `As per quotation: RM ${input.transport_cost.toLocaleString()}`,
      documents_required: ['Transport quotation', 'Invoice', 'Payment receipt'],
    });
  }

  // H. Consumable Training Materials
  if (input.materials_cost !== undefined) {
    const matCost = input.materials_cost || 100;
    items.push({
      item: 'Consumable Training Materials',
      eligible: true,
      amount: matCost,
      calculation: matCost <= 100
        ? `RM ${matCost} per group (no quotation needed)`
        : `RM ${matCost.toLocaleString()} (itemised invoice required)`,
      documents_required: matCost > 100 ? ['Itemised invoice', 'Payment receipt'] : ['None (under RM100)'],
      notes: matCost > 100 ? 'Itemised invoice required for amounts exceeding RM100' : undefined,
    });
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  const rate = 100; // domestic = 100% assistance
  const net = Math.round(total * rate / 100);

  const typeLabel = input.training_type === 'in_house' ? 'In-House'
    : input.training_type === 'public_local' ? 'Public/Local'
    : 'Remote Online';

  return {
    cost_items: items,
    total_claimable: total,
    financial_assistance_rate: rate,
    net_claimable: net,
    summary: `${typeLabel}: ${days} day(s), ${pax} pax. Max claimable: RM ${net.toLocaleString()}`,
  };
}
