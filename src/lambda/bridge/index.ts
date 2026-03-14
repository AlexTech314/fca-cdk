/**
 * Bridge Lambda
 *
 * Invoked by PostgreSQL AFTER INSERT trigger via the aws_lambda extension.
 * Routes new_lead events to the scrape queue.
 *
 * Scoring and contact extraction are enqueued directly by the scrape task
 * after scraping completes (no longer routed through this lambda).
 *
 * Payload from PG trigger:
 *   { "event": "new_lead", "lead_id": "uuid", "place_id": "string", "website": "url" }
 */

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';

const sqsClient = new SQSClient({});

let _prisma: PrismaClient | undefined;
async function getDb(): Promise<PrismaClient> {
  if (!_prisma) {
    await bootstrapDatabaseUrl();
    _prisma = new PrismaClient();
  }
  return _prisma;
}

const SCRAPE_QUEUE_URL = process.env.SCRAPE_QUEUE_URL!;

interface TriggerEvent {
  event: 'new_lead';
  lead_id: string;
  place_id: string;
  website?: string;
}

export async function handler(event: TriggerEvent): Promise<{ statusCode: number; body: string }> {
  console.log('Bridge Lambda received:', JSON.stringify(event));

  const { event: eventType, lead_id, website } = event;

  if (eventType !== 'new_lead' || !lead_id) {
    console.warn('Ignoring unexpected event:', JSON.stringify(event));
    return { statusCode: 200, body: 'Ignored' };
  }

  // New lead inserted -> send to scrape queue (only if it has a website)
  if (!website || typeof website !== 'string' || website.trim() === '') {
    console.log(`Lead ${lead_id} has no website, skipping scrape queue`);
    return { statusCode: 200, body: 'No website' };
  }

  try {
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: SCRAPE_QUEUE_URL,
      MessageBody: JSON.stringify({ lead_id, place_id: event.place_id, website }),
    }));
    const db = await getDb();
    await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'queued_for_scrape', scrapeError: null } });
    console.log(`Sent lead ${lead_id} to scrape queue`);
    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Bridge Lambda error:', error);
    throw error;
  }
}
