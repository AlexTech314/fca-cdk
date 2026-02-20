/**
 * Scrape Trigger Lambda
 *
 * Consumes messages from ScrapeQueue (sent by Bridge Lambda when new leads are inserted).
 * Batches incoming messages and starts the Step Functions scrape workflow.
 * Prepare Scrape will query the DB for all unscraped leads, so we only need to trigger the workflow.
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({});
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN!;

export async function handler(event: SQSEvent): Promise<void> {
  if (!STATE_MACHINE_ARN) {
    console.error('STATE_MACHINE_ARN not configured');
    throw new Error('STATE_MACHINE_ARN not configured');
  }

  const recordCount = event.Records?.length ?? 0;
  console.log(`ScrapeTrigger received ${recordCount} message(s) from ScrapeQueue`);

  if (recordCount === 0) {
    return;
  }

  // Parse lead IDs from messages (for logging)
  const leadIds = event.Records.map((r: SQSRecord) => {
    try {
      const body = JSON.parse(r.body);
      return body.lead_id ?? 'unknown';
    } catch {
      return 'parse-error';
    }
  });
  console.log('Lead IDs in batch:', leadIds.slice(0, 10).join(', '), leadIds.length > 10 ? `... (+${leadIds.length - 10} more)` : '');

  // Start one Step Functions execution. Prepare Scrape will find all unscraped leads.
  const input = {
    triggeredAt: new Date().toISOString(),
    messageCount: recordCount,
    leadIds: leadIds.slice(0, 100),
  };

  const result = await sfnClient.send(new StartExecutionCommand({
    stateMachineArn: STATE_MACHINE_ARN,
    input: JSON.stringify(input),
  }));

  console.log(`Started Step Functions execution: ${result.executionArn}`);
}
