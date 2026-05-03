import PDFDocument from 'pdfkit';

interface ProposalPdfData {
  proposal_id: string;
  proposal_message: string;
  proposed_fee: number | null;
  proposed_schedule: string | null;
  proposed_duration: string | null;
  trainer_details: string | null;
  value_add_offers: any;
  attachments: any;
  ai_value_score: number | null;
  status: string;
  created_at: Date;
  provider: {
    provider_name: string;
    logo_url: string | null;
    quality_tier: string;
    average_rating: number;
    total_completed_programs: number;
  };
  request: {
    title: string;
    description?: string;
    participant_count?: number;
    preferred_mode?: string;
    preferred_location?: string;
    budget_min?: number | null;
    budget_max?: number | null;
  };
  program?: {
    title: string;
    description: string | null;
    objective: string | null;
    delivery_mode: string | null;
  } | null;
}

interface ParsedProposal {
  coverMessage: string;
  programTitle: string;
  programDescription: string;
  objective: string;
  targetAudience: string;
  deliveryMode: string;
  duration: string;
  language: string;
  maxParticipants: string;
  location: string;
  agenda: { day: number; modules: { title: string; isBreak: boolean }[] }[];
}

function parseProposalMessage(message: string): ParsedProposal {
  const result: ParsedProposal = {
    coverMessage: '',
    programTitle: '',
    programDescription: '',
    objective: '',
    targetAudience: '',
    deliveryMode: '',
    duration: '',
    language: '',
    maxParticipants: '',
    location: '',
    agenda: [],
  };

  // Split by section markers
  const programSplit = message.split('--- Program Details ---');
  result.coverMessage = programSplit[0].trim();

  if (programSplit.length > 1) {
    const afterProgram = programSplit[1];
    const moduleSplit = afterProgram.split('--- Training Modules ---');
    const detailsSection = moduleSplit[0];

    // Parse key-value pairs
    const lines = detailsSection.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Title:')) result.programTitle = trimmed.replace('Title:', '').trim();
      else if (trimmed.startsWith('Description:')) result.programDescription = trimmed.replace('Description:', '').trim();
      else if (trimmed.startsWith('Objective/Learning Outcomes:')) result.objective = trimmed.replace('Objective/Learning Outcomes:', '').trim();
      else if (trimmed.startsWith('Target Audience:')) result.targetAudience = trimmed.replace('Target Audience:', '').trim();
      else if (trimmed.startsWith('Delivery Mode:')) result.deliveryMode = trimmed.replace('Delivery Mode:', '').trim();
      else if (trimmed.startsWith('Duration:')) result.duration = trimmed.replace('Duration:', '').trim();
      else if (trimmed.startsWith('Language:')) result.language = trimmed.replace('Language:', '').trim();
      else if (trimmed.startsWith('Max Participants:')) result.maxParticipants = trimmed.replace('Max Participants:', '').trim();
      else if (trimmed.startsWith('Location:')) result.location = trimmed.replace('Location:', '').trim();
    }

    // Parse agenda
    if (moduleSplit.length > 1) {
      const agendaText = moduleSplit[1].trim();
      const dayBlocks = agendaText.split(/Day (\d+):/);
      for (let i = 1; i < dayBlocks.length; i += 2) {
        const dayNum = parseInt(dayBlocks[i], 10);
        const modulesText = dayBlocks[i + 1] || '';
        const modules: { title: string; isBreak: boolean }[] = [];
        for (const mLine of modulesText.split('\n')) {
          const mt = mLine.trim();
          if (!mt) continue;
          if (mt.startsWith('☕')) {
            modules.push({ title: mt.replace('☕', '').trim(), isBreak: true });
          } else if (mt.startsWith('•')) {
            modules.push({ title: mt.replace('•', '').trim(), isBreak: false });
          }
        }
        if (modules.length > 0) {
          result.agenda.push({ day: dayNum, modules });
        }
      }
    }
  }

  return result;
}

function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
}

export function generateProposalPdf(data: ProposalPdfData, baseUrl: string): PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Training Proposal - ${data.provider.provider_name}`,
      Author: data.provider.provider_name,
      Subject: `Proposal for: ${data.request.title}`,
    },
  });

  const parsed = parseProposalMessage(data.proposal_message);
  const pageWidth = 595.28 - 100; // A4 width minus margins
  const accentColor = '#1e40af';
  const mutedColor = '#6b7280';
  const darkColor = '#111827';

  // =============================================
  // HEADER — Provider Name + Proposal Title
  // =============================================
  doc.rect(0, 0, 595.28, 120).fill('#1e3a5f');

  doc.fillColor('#ffffff')
    .fontSize(22)
    .font('Helvetica-Bold')
    .text(data.provider.provider_name, 50, 35, { width: pageWidth });

  const tierLabel = data.provider.quality_tier
    ? data.provider.quality_tier.charAt(0).toUpperCase() + data.provider.quality_tier.slice(1) + ' Provider'
    : '';
  if (tierLabel) {
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor('#93c5fd')
      .text(tierLabel, 50, 62);
  }

  doc.fillColor('#e2e8f0')
    .fontSize(11)
    .font('Helvetica')
    .text('TRAINING PROPOSAL', 50, 88, { width: pageWidth });

  doc.fillColor('#ffffff')
    .fontSize(13)
    .font('Helvetica-Bold')
    .text(data.request.title, 50, 102, { width: pageWidth, lineBreak: true });

  let y = 140;

  // =============================================
  // PROPOSAL SUMMARY BOX
  // =============================================
  doc.rect(50, y, pageWidth, 70).fill('#f0f4ff');
  doc.rect(50, y, 3, 70).fill(accentColor);

  const colW = pageWidth / 4;
  const summaryItems = [
    { label: 'Proposed Fee', value: data.proposed_fee ? formatCurrency(Number(data.proposed_fee)) : 'N/A' },
    { label: 'Duration', value: parsed.duration || data.proposed_duration || 'N/A' },
    { label: 'Delivery Mode', value: parsed.deliveryMode || 'N/A' },
    { label: 'Submitted', value: formatDate(data.created_at) },
  ];

  summaryItems.forEach((item, i) => {
    doc.fillColor(mutedColor)
      .fontSize(8)
      .font('Helvetica')
      .text(item.label.toUpperCase(), 60 + i * colW, y + 15, { width: colW - 10 });
    doc.fillColor(darkColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(item.value, 60 + i * colW, y + 30, { width: colW - 10 });
  });

  y += 90;

  // =============================================
  // COVER MESSAGE
  // =============================================
  if (parsed.coverMessage) {
    doc.fillColor(darkColor)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Proposal Message', 50, y);
    y += 20;
    doc.fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(parsed.coverMessage, 50, y, { width: pageWidth, lineGap: 3 });
    y = doc.y + 20;
  }

  // =============================================
  // PROGRAM DETAILS
  // =============================================
  if (parsed.programTitle) {
    // Check if we need a new page
    if (y > 650) { doc.addPage(); y = 50; }

    doc.fillColor(accentColor)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Program Details', 50, y);
    y += 5;
    doc.moveTo(50, y + 15).lineTo(50 + pageWidth, y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 25;

    const details: [string, string][] = [
      ['Program Title', parsed.programTitle],
      ['Target Audience', parsed.targetAudience],
      ['Delivery Mode', parsed.deliveryMode],
      ['Duration', parsed.duration],
      ['Language', parsed.language],
      ['Max Participants', parsed.maxParticipants],
      ['Location', parsed.location],
    ].filter(([, v]) => v) as [string, string][];

    for (const [label, value] of details) {
      if (y > 720) { doc.addPage(); y = 50; }
      doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(label, 50, y, { width: 130 });
      doc.fillColor(darkColor).fontSize(10).font('Helvetica').text(value, 185, y, { width: pageWidth - 135 });
      y = Math.max(doc.y, y + 16) + 4;
    }

    // Description
    if (parsed.programDescription) {
      y += 5;
      if (y > 650) { doc.addPage(); y = 50; }
      doc.fillColor(mutedColor).fontSize(9).font('Helvetica-Bold').text('Description', 50, y);
      y += 14;
      doc.fillColor('#374151').fontSize(10).font('Helvetica').text(parsed.programDescription, 50, y, { width: pageWidth, lineGap: 3 });
      y = doc.y + 10;
    }

    // Objectives
    if (parsed.objective) {
      if (y > 650) { doc.addPage(); y = 50; }
      doc.fillColor(mutedColor).fontSize(9).font('Helvetica-Bold').text('Learning Outcomes / Objectives', 50, y);
      y += 14;
      // Split by common delimiters
      const objectives = parsed.objective.split(/[;\n]|(?:- )/).map(o => o.trim()).filter(Boolean);
      for (const obj of objectives) {
        if (y > 720) { doc.addPage(); y = 50; }
        doc.fillColor(accentColor).fontSize(10).text('\u2022', 55, y);
        doc.fillColor('#374151').fontSize(10).font('Helvetica').text(obj, 70, y, { width: pageWidth - 25 });
        y = doc.y + 5;
      }
      y += 5;
    }
  }

  // =============================================
  // TRAINING MODULES / AGENDA
  // =============================================
  if (parsed.agenda.length > 0) {
    if (y > 600) { doc.addPage(); y = 50; }

    doc.fillColor(accentColor)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Training Modules', 50, y);
    y += 5;
    doc.moveTo(50, y + 15).lineTo(50 + pageWidth, y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 25;

    for (const day of parsed.agenda) {
      if (y > 680) { doc.addPage(); y = 50; }

      // Day header
      doc.rect(50, y, pageWidth, 22).fill('#eef2ff');
      doc.fillColor(accentColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`Day ${day.day}`, 58, y + 5);
      y += 30;

      for (const mod of day.modules) {
        if (y > 720) { doc.addPage(); y = 50; }
        if (mod.isBreak) {
          doc.fillColor('#92400e').fontSize(9).font('Helvetica').text(`\u2615  ${mod.title}`, 70, y, { width: pageWidth - 30 });
        } else {
          doc.fillColor(darkColor).fontSize(10).font('Helvetica').text(`\u2022  ${mod.title}`, 65, y, { width: pageWidth - 25 });
        }
        y = doc.y + 6;
      }
      y += 8;
    }
  }

  // =============================================
  // TRAINER DETAILS
  // =============================================
  if (data.trainer_details) {
    if (y > 650) { doc.addPage(); y = 50; }

    doc.fillColor(accentColor)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Trainer Details', 50, y);
    y += 5;
    doc.moveTo(50, y + 15).lineTo(50 + pageWidth, y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 25;

    doc.fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(data.trainer_details, 50, y, { width: pageWidth, lineGap: 3 });
    y = doc.y + 15;
  }

  // =============================================
  // VALUE-ADD OFFERS
  // =============================================
  const valueAdds = Array.isArray(data.value_add_offers) ? data.value_add_offers : [];
  if (valueAdds.length > 0) {
    if (y > 650) { doc.addPage(); y = 50; }

    doc.fillColor(accentColor)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Value-Add Offers', 50, y);
    y += 5;
    doc.moveTo(50, y + 15).lineTo(50 + pageWidth, y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 25;

    for (const va of valueAdds) {
      if (y > 720) { doc.addPage(); y = 50; }
      const desc = typeof va === 'string' ? va : va.description || va.type || JSON.stringify(va);
      doc.fillColor(darkColor).fontSize(10).font('Helvetica').text(`\u2713  ${desc}`, 55, y, { width: pageWidth - 10 });
      y = doc.y + 6;
    }
    y += 10;
  }

  // =============================================
  // SUPPORTING DOCUMENTS
  // =============================================
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];
  if (attachments.length > 0) {
    if (y > 650) { doc.addPage(); y = 50; }

    doc.fillColor(accentColor)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Supporting Documents', 50, y);
    y += 5;
    doc.moveTo(50, y + 15).lineTo(50 + pageWidth, y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
    y += 25;

    doc.fillColor(mutedColor)
      .fontSize(9)
      .font('Helvetica')
      .text('The following documents have been submitted with this proposal. Download them from the platform.', 50, y, { width: pageWidth });
    y = doc.y + 10;

    for (const att of attachments) {
      if (y > 720) { doc.addPage(); y = 50; }
      const sizeStr = att.file_size ? ` (${(att.file_size / 1024).toFixed(0)} KB)` : '';
      doc.fillColor(darkColor)
        .fontSize(10)
        .font('Helvetica')
        .text(`\u2022  ${att.file_name}${sizeStr}`, 55, y, { width: pageWidth - 10 });

      // Add clickable link
      const downloadUrl = `${baseUrl}${att.file_url}`;
      doc.fillColor(accentColor)
        .fontSize(9)
        .font('Helvetica')
        .text(`Download: ${downloadUrl}`, 70, doc.y + 2, {
          width: pageWidth - 25,
          link: downloadUrl,
          underline: true,
        });
      y = doc.y + 10;
    }
    y += 5;
  }

  // =============================================
  // PROVIDER INFO SECTION
  // =============================================
  if (y > 650) { doc.addPage(); y = 50; }

  doc.fillColor(accentColor)
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('About the Provider', 50, y);
  y += 5;
  doc.moveTo(50, y + 15).lineTo(50 + pageWidth, y + 15).strokeColor('#e5e7eb').lineWidth(1).stroke();
  y += 25;

  const providerDetails: [string, string][] = [
    ['Provider Name', data.provider.provider_name],
    ['Quality Tier', data.provider.quality_tier ? data.provider.quality_tier.charAt(0).toUpperCase() + data.provider.quality_tier.slice(1) : 'N/A'],
    ['Average Rating', data.provider.average_rating ? `${Number(data.provider.average_rating).toFixed(1)} / 5.0` : 'N/A'],
    ['Programs Completed', String(data.provider.total_completed_programs || 0)],
  ];

  for (const [label, value] of providerDetails) {
    doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(label, 50, y, { width: 140 });
    doc.fillColor(darkColor).fontSize(10).font('Helvetica').text(value, 195, y, { width: pageWidth - 145 });
    y += 18;
  }

  // =============================================
  // FOOTER
  // =============================================
  const footerY = 795;
  doc.fillColor('#d1d5db')
    .fontSize(8)
    .font('Helvetica')
    .text(
      `Generated on ${formatDate(new Date())} | Proposal ID: ${data.proposal_id}`,
      50,
      footerY,
      { width: pageWidth, align: 'center' },
    );

  doc.end();
  return doc;
}
