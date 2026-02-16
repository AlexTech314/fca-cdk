/**
 * Score Leads Lambda
 *
 * Consumes SQS scoring queue (batch size = 10).
 * Calls Claude API to score each lead, updates Postgres.
 */

import { SQSEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

// Cached outside handler for warm invocations
const secretsManager = new SecretsManagerClient({});
let cachedDatabaseUrl: string | null = null;
let pgClient: Client | null = null;

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY!;

async function getDatabaseUrl(): Promise<string> {
  if (cachedDatabaseUrl) return cachedDatabaseUrl;
  const secretArn = process.env.DATABASE_SECRET_ARN;
  const host = process.env.DATABASE_HOST;
  if (!secretArn || !host) {
    throw new Error('DATABASE_SECRET_ARN and DATABASE_HOST are required');
  }
  const res = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const secret = JSON.parse(res.SecretString!);
  const { username, password, dbname } = secret;
  const port = secret.port ?? 5432;
  cachedDatabaseUrl = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbname}?sslmode=require`;
  return cachedDatabaseUrl;
}

async function getPgClient(): Promise<Client> {
  if (pgClient) return pgClient;
  const url = await getDatabaseUrl();
  pgClient = new Client({ connectionString: url });
  await pgClient.connect();
  return pgClient;
}

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
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { score: 50, notes: 'Unable to parse Claude response' };
  }
}

export async function handler(event: SQSEvent): Promise<void> {
  console.log(`Score Lambda received ${event.Records.length} messages`);

  const client = await getPgClient();

  for (const record of event.Records) {
    const message: LeadMessage = JSON.parse(record.body);
    const { lead_id } = message;

    try {
      // Fetch lead data from Postgres
      const leadResult = await client.query(
        `SELECT * FROM leads WHERE id = $1`,
        [lead_id]
      );

      if (leadResult.rows.length === 0) {
        console.warn(`Lead ${lead_id} not found, skipping`);
        continue;
      }

      const lead = leadResult.rows[0];

      // Skip if already qualified
      if (lead.qualification_score !== null) {
        console.log(`Lead ${lead_id} already scored (${lead.qualification_score}), skipping`);
        continue;
      }

      // Prepare lead data for Claude (include scraped data if available)
      const leadData = {
        name: lead.name,
        business_type: lead.business_type,
        city: lead.city,
        state: lead.state,
        phone: lead.phone,
        website: lead.website,
        rating: lead.rating,
        review_count: lead.review_count,
        price_level: lead.price_level,
        web_scraped_data: lead.web_scraped_data,
      };

      // Score with Claude
      const result = await scoreLead(leadData);

      // Update lead in Postgres
      await client.query(
        `UPDATE leads SET
           qualification_score = $1,
           qualification_notes = $2,
           qualified_at = NOW(),
           updated_at = NOW()
         WHERE id = $3`,
        [result.score, result.notes, lead_id]
      );

      console.log(`Scored lead ${lead_id}: ${result.score}/100`);
    } catch (error) {
      console.error(`Failed to score lead ${lead_id}:`, error);
      // Let SQS retry via visibility timeout / DLQ
      throw error;
    }
  }
  // Do not end() - keep connection warm for next invocation
}
