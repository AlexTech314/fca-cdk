import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, ANALYTICS_TABLE } from '../lib/dynamodb';
import type { TimeSeriesPoint, TopPage } from '../models/analytics.model';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

/** Floor a Date to its 5-minute bucket: YYYY-MM-DDTHH:MM */
function toBucket(date: Date): string {
  const m = date.getUTCMinutes();
  const floored = m - (m % 5);
  const d = new Date(date);
  d.setUTCMinutes(floored, 0, 0);
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

export const analyticsRepository = {
  async recordPageView(path: string) {
    const bucket = toBucket(new Date());
    const ttl = Math.floor(Date.now() / 1000) + THIRTY_DAYS_SECONDS;

    await ddb.send(
      new UpdateCommand({
        TableName: ANALYTICS_TABLE,
        Key: { pk: `PV#${path}`, sk: bucket },
        UpdateExpression: 'ADD #c :inc SET #ttl = if_not_exists(#ttl, :ttl), gsi1pk = :gsi1pk, gsi1sk = :gsi1sk',
        ExpressionAttributeNames: { '#c': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':inc': 1,
          ':ttl': ttl,
          ':gsi1pk': 'PV',
          ':gsi1sk': `${bucket}#${path}`,
        },
      })
    );
  },

  async recordReferrer(source: string) {
    const bucket = toBucket(new Date());
    const ttl = Math.floor(Date.now() / 1000) + THIRTY_DAYS_SECONDS;

    await ddb.send(
      new UpdateCommand({
        TableName: ANALYTICS_TABLE,
        Key: { pk: `REF#${source}`, sk: bucket },
        UpdateExpression: 'ADD #c :inc SET #ttl = if_not_exists(#ttl, :ttl), gsi1pk = :gsi1pk, gsi1sk = :gsi1sk',
        ExpressionAttributeNames: { '#c': 'count', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':inc': 1,
          ':ttl': ttl,
          ':gsi1pk': 'REF',
          ':gsi1sk': `${bucket}#${source}`,
        },
      })
    );
  },

  /** Query page views for a specific path in a time range */
  async getPageViewsByPage(
    path: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesPoint[]> {
    const startBucket = toBucket(startDate);
    const endBucket = toBucket(endDate);

    const result = await ddb.send(
      new QueryCommand({
        TableName: ANALYTICS_TABLE,
        KeyConditionExpression: 'pk = :pk AND sk BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':pk': `PV#${path}`,
          ':start': startBucket,
          ':end': endBucket,
        },
      })
    );

    return (result.Items || []).map((item) => ({
      bucket: item.sk as string,
      count: (item.count as number) || 0,
    }));
  },

  /** Query all page views in a time range via GSI1 */
  async getAllPageViews(
    startDate: Date,
    endDate: Date
  ): Promise<{ path: string; data: TimeSeriesPoint[]; total: number }[]> {
    const startBucket = toBucket(startDate);
    const endBucket = toBucket(endDate);

    const items: Record<string, any>[] = [];
    let lastKey: Record<string, any> | undefined;

    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: ANALYTICS_TABLE,
          IndexName: 'gsi1',
          KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk BETWEEN :start AND :end',
          ExpressionAttributeValues: {
            ':pk': 'PV',
            ':start': startBucket,
            // Use ~ (tilde) to ensure we capture all paths at the end bucket time
            ':end': `${endBucket}~`,
          },
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...(result.Items || []));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // Group by path
    const byPath: Record<string, TimeSeriesPoint[]> = {};
    for (const item of items) {
      const gsi1sk = item.gsi1sk as string;
      const hashIdx = gsi1sk.indexOf('#');
      const bucket = gsi1sk.slice(0, hashIdx);
      const path = gsi1sk.slice(hashIdx + 1);
      const count = (item.count as number) || 0;

      if (!byPath[path]) byPath[path] = [];
      byPath[path].push({ bucket, count });
    }

    return Object.entries(byPath).map(([path, data]) => ({
      path,
      data: data.sort((a, b) => a.bucket.localeCompare(b.bucket)),
      total: data.reduce((sum, d) => sum + d.count, 0),
    }));
  },

  /** Query all referrers in a time range via GSI1 */
  async getReferrers(
    startDate: Date,
    endDate: Date
  ): Promise<{ source: string; data: TimeSeriesPoint[]; total: number }[]> {
    const startBucket = toBucket(startDate);
    const endBucket = toBucket(endDate);

    const items: Record<string, any>[] = [];
    let lastKey: Record<string, any> | undefined;

    do {
      const result = await ddb.send(
        new QueryCommand({
          TableName: ANALYTICS_TABLE,
          IndexName: 'gsi1',
          KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk BETWEEN :start AND :end',
          ExpressionAttributeValues: {
            ':pk': 'REF',
            ':start': startBucket,
            ':end': `${endBucket}~`,
          },
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...(result.Items || []));
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // Group by source
    const bySource: Record<string, TimeSeriesPoint[]> = {};
    for (const item of items) {
      const gsi1sk = item.gsi1sk as string;
      const hashIdx = gsi1sk.indexOf('#');
      const bucket = gsi1sk.slice(0, hashIdx);
      const source = gsi1sk.slice(hashIdx + 1);
      const count = (item.count as number) || 0;

      if (!bySource[source]) bySource[source] = [];
      bySource[source].push({ bucket, count });
    }

    return Object.entries(bySource).map(([source, data]) => ({
      source,
      data: data.sort((a, b) => a.bucket.localeCompare(b.bucket)),
      total: data.reduce((sum, d) => sum + d.count, 0),
    }));
  },

  /** Get top pages by total views in a time range */
  async getTopPages(days: number): Promise<TopPage[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pages = await this.getAllPageViews(startDate, endDate);
    return pages
      .map((p) => ({ path: p.path, views: p.total }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);
  },
};
