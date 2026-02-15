/**
 * Bridge Lambda
 *
 * Invoked by PostgreSQL AFTER INSERT/UPDATE triggers via the aws_lambda extension.
 * Routes events to the correct SQS queue based on the event type.
 *
 * Payload from PG trigger:
 *   { "event": "new_lead" | "lead_scraped", "lead_id": "uuid", "place_id": "string" }
 */

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({});

const SCRAPE_QUEUE_URL = process.env.SCRAPE_QUEUE_URL!;
const SCORING_QUEUE_URL = process.env.SCORING_QUEUE_URL!;

interface TriggerEvent {
  event: 'new_lead' | 'lead_scraped';
  lead_id: string;
  place_id: string;
}

export async function handler(event: TriggerEvent): Promise<{ statusCode: number; body: string }> {
  console.log('Bridge Lambda received:', JSON.stringify(event));

  const { event: eventType, lead_id, place_id } = event;

  if (!eventType || !lead_id) {
    console.error('Invalid event payload:', event);
    return { statusCode: 400, body: 'Invalid event payload' };
  }

  try {
    switch (eventType) {
      case 'new_lead': {
        // New lead inserted -> send to scrape queue
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: SCRAPE_QUEUE_URL,
          MessageBody: JSON.stringify({ lead_id, place_id }),
          MessageGroupId: undefined, // Standard queue, no group ID
        }));
        console.log(`Sent lead ${lead_id} to scrape queue`);
        break;
      }

      case 'lead_scraped': {
        // Lead has been scraped -> send to scoring queue
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: SCORING_QUEUE_URL,
          MessageBody: JSON.stringify({ lead_id, place_id }),
        }));
        console.log(`Sent lead ${lead_id} to scoring queue`);
        break;
      }

      default:
        console.warn(`Unknown event type: ${eventType}`);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Bridge Lambda error:', error);
    throw error;
  }
}
