import { prisma } from '../../config/database.js';
import { chat, isAIConfigured } from './ai-client.js';
import { matchPrograms } from './matching.service.js';
import { AppError } from '../../shared/errors/AppError.js';

const SYSTEM_PROMPT = `You are the Training Market AI Training Advisor. You help employers and individuals find the right training programs in Malaysia.

Rules:
- Only recommend programs that exist in the catalog (you will receive search results)
- Always explain why you recommend a program
- Ask clarifying questions when the need is vague (team size, budget, timeline, delivery preference)
- Consider budget, location, delivery mode, team size, and timeline
- If no suitable programs exist, suggest creating a broadcast request
- Be concise and professional
- Never make up program names or details
- Always mention the provider name and key details (fee, duration, mode)
- Respond in JSON format with: { "message": "your response", "action": "search"|"recommend"|"clarify"|"broadcast"|null, "search_query": "if action is search" }`;

export async function createConversation(userId: string) {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      role: true,
      full_name: true,
      employer_profile: { select: { industry: true, company_size: true, training_interests: true } },
      individual_profile: { select: { skill_interests: true, career_goals: true } },
    },
  });

  let userContext = '';
  if (user?.role === 'employer' && user.employer_profile) {
    userContext = `User is an employer. Industry: ${user.employer_profile.industry || 'unknown'}. Company size: ${user.employer_profile.company_size || 'unknown'}. Training interests: ${user.employer_profile.training_interests?.join(', ') || 'none specified'}.`;
  } else if (user?.role === 'individual' && user.individual_profile) {
    userContext = `User is an individual learner. Skill interests: ${user.individual_profile.skill_interests?.join(', ') || 'none'}. Career goals: ${user.individual_profile.career_goals || 'not specified'}.`;
  }

  const conversation = await prisma.advisorConversation.create({
    data: {
      user_id: userId,
      title: 'New conversation',
      messages: [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nUser context: ${userContext}`,
        },
        {
          role: 'assistant',
          content: JSON.stringify({
            message: `Hi ${user?.full_name || 'there'}! I'm your Training Advisor. Tell me what training you're looking for, and I'll help you find the best options. You can describe the skills you need, the challenge you're facing, or the topic you're interested in.`,
            action: null,
          }),
        },
      ],
    },
  });

  return {
    conversation_id: conversation.conversation_id,
    message: `Hi ${user?.full_name || 'there'}! I'm your Training Advisor. Tell me what training you're looking for, and I'll help you find the best options.`,
    programs_mentioned: [],
  };
}

export async function sendMessage(userId: string, conversationId: string, userMessage: string) {
  const conversation = await prisma.advisorConversation.findUnique({
    where: { conversation_id: conversationId },
  });

  if (!conversation) throw AppError.notFound('Conversation not found');
  if (conversation.user_id !== userId) throw AppError.forbidden('Not your conversation');

  const messages = conversation.messages as Array<{ role: string; content: string }>;

  // Add user message
  messages.push({ role: 'user', content: userMessage });

  if (!isAIConfigured()) {
    // Fallback: do a text search and return results
    const results = await matchPrograms(userMessage, {}, 5, userId);
    const fallbackMsg = results.length > 0
      ? `I found ${results.length} programs matching "${userMessage}". Here are the top results:`
      : `I couldn't find programs matching "${userMessage}". Consider broadcasting a training request to all providers.`;

    messages.push({ role: 'assistant', content: JSON.stringify({ message: fallbackMsg, action: 'recommend' }) });

    await prisma.advisorConversation.update({
      where: { conversation_id: conversationId },
      data: {
        messages,
        title: conversation.title === 'New conversation' ? userMessage.slice(0, 100) : conversation.title,
      },
    });

    return {
      message: fallbackMsg,
      programs_mentioned: results.slice(0, 5).map((p) => ({
        program_id: p.program_id,
        title: p.title,
        match_score: p.match_score,
      })),
      suggested_action: results.length > 0 ? 'view_program' : 'broadcast',
    };
  }

  // Call AI
  const chatMessages = messages
    .filter((m) => m.role !== 'system' || messages.indexOf(m) === 0)
    .map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content }));

  const aiResponse = await chat(chatMessages, true);

  let parsed: { message: string; action?: string; search_query?: string };
  try {
    parsed = JSON.parse(aiResponse.content);
  } catch {
    parsed = { message: aiResponse.content, action: null as any };
  }

  // If AI wants to search, do it
  let programs: any[] = [];
  if (parsed.action === 'search' && parsed.search_query) {
    const results = await matchPrograms(parsed.search_query, {}, 5, userId);
    programs = results.slice(0, 5);

    // Feed results back to AI for recommendation
    const programSummary = programs
      .map((p, i) => `${i + 1}. "${p.title}" by ${p.provider?.provider_name} — RM${p.fee_per_pax || p.fee_per_group}/pax, ${p.duration_days} days, ${p.delivery_mode}, Match: ${p.match_score}%`)
      .join('\n');

    chatMessages.push({ role: 'assistant', content: aiResponse.content });
    chatMessages.push({
      role: 'user',
      content: `Search results:\n${programSummary}\n\nPlease recommend the best options from these results with reasoning. Respond in JSON: { "message": "your recommendation" }`,
    });

    const recommendResponse = await chat(chatMessages, true);
    try {
      parsed = JSON.parse(recommendResponse.content);
    } catch {
      parsed = { message: recommendResponse.content };
    }
  }

  messages.push({ role: 'assistant', content: JSON.stringify(parsed) });

  // Update conversation
  const programIds = programs.map((p) => p.program_id);
  await prisma.advisorConversation.update({
    where: { conversation_id: conversationId },
    data: {
      messages,
      title: conversation.title === 'New conversation' ? userMessage.slice(0, 100) : conversation.title,
      programs_recommended: { push: programIds },
    },
  });

  return {
    message: parsed.message,
    programs_mentioned: programs.map((p) => ({
      program_id: p.program_id,
      title: p.title,
      match_score: p.match_score,
      provider_name: p.provider?.provider_name,
      fee_per_pax: p.fee_per_pax,
      duration_days: p.duration_days,
      delivery_mode: p.delivery_mode,
    })),
    suggested_action: parsed.action === 'broadcast' ? 'broadcast' : programs.length > 0 ? 'view_program' : null,
  };
}

export async function listConversations(userId: string) {
  return prisma.advisorConversation.findMany({
    where: { user_id: userId, status: 'active' },
    orderBy: { updated_at: 'desc' },
    select: {
      conversation_id: true,
      title: true,
      updated_at: true,
    },
  });
}

export async function getConversation(userId: string, conversationId: string) {
  const conv = await prisma.advisorConversation.findUnique({
    where: { conversation_id: conversationId },
  });
  if (!conv) throw AppError.notFound('Conversation not found');
  if (conv.user_id !== userId) throw AppError.forbidden('Not your conversation');

  // Filter out system messages for display
  const messages = (conv.messages as any[]).filter((m) => m.role !== 'system').map((m) => {
    if (m.role === 'assistant') {
      try {
        const parsed = JSON.parse(m.content);
        return { role: m.role, content: parsed.message || m.content };
      } catch {
        return m;
      }
    }
    return m;
  });

  return { ...conv, messages };
}

export async function deleteConversation(userId: string, conversationId: string) {
  const conv = await prisma.advisorConversation.findUnique({
    where: { conversation_id: conversationId },
  });
  if (!conv) throw AppError.notFound('Conversation not found');
  if (conv.user_id !== userId) throw AppError.forbidden('Not your conversation');

  await prisma.advisorConversation.update({
    where: { conversation_id: conversationId },
    data: { status: 'archived' },
  });
}
