/**
 * Score Leads Lambda
 *
 * Consumes SQS scoring queue (batch size = 10).
 * Calls Claude API to score each lead, updates Postgres via Prisma.
 */

import { SQSEvent } from 'aws-lambda';
import { bootstrapDatabaseUrl, prisma } from '@fca/db';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY!;

interface LeadMessage {
  lead_id: string;
  place_id: string;
}

interface ClaudeScoreResult {
  score: number;
  notes: string;
}

async function scoreLead(leadData: Record<string, unknown>): Promise<ClaudeScoreResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are an M&A lead qualification analyst for Flatirons Capital Advisors, an investment bank specializing in lower middle market transactions.

Score this business lead on a scale of 0-100 based on its acquisition potential. Consider:
- Revenue indicators (review count, price level as proxies)
- Online presence and professionalism
- Industry fit for M&A transactions
- Geographic market strength
- Owner operator characteristics

Business data:
${JSON.stringify(leadData, null, 2)}

Respond with ONLY valid JSON in this exact format:
{"score": <number 0-100>, "notes": "<bullet points explaining score>"}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as { content: Array<{ text: string }> };
  const text = data.content[0]?.text || '';

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { score: 50, notes: 'Unable to parse Claude response' };
  }
}

export async function handler(event: SQSEvent): Promise<void> {
  await bootstrapDatabaseUrl();
  console.log(`Score Lambda received ${event.Records.length} messages`);

  for (const record of event.Records) {
    const message: LeadMessage = JSON.parse(record.body);
    const { lead_id } = message;

    try {
      const lead = await prisma.lead.findUnique({ where: { id: lead_id } });

      if (!lead) {
        console.warn(`Lead ${lead_id} not found, skipping`);
        continue;
      }

      if (lead.qualificationScore !== null) {
        console.log(`Lead ${lead_id} already scored (${lead.qualificationScore}), skipping`);
        continue;
      }

      const leadData = {
        name: lead.name,
        business_type: lead.businessType,
        city: lead.city,
        state: lead.state,
        phone: lead.phone,
        website: lead.website,
        rating: lead.rating,
        review_count: lead.reviewCount,
        price_level: lead.priceLevel,
        web_scraped_data: lead.webScrapedData,
      };

      const result = await scoreLead(leadData);

      await prisma.lead.update({
        where: { id: lead_id },
        data: {
          qualificationScore: result.score,
          qualificationNotes: result.notes,
          qualifiedAt: new Date(),
        },
      });

      console.log(`Scored lead ${lead_id}: ${result.score}/100`);
    } catch (error) {
      console.error(`Failed to score lead ${lead_id}:`, error);
      throw error;
    }
  }
}
