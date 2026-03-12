import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  QueryExecutionState,
} from '@aws-sdk/client-athena';

const athena = new AthenaClient({});

const WORKGROUP = process.env.ATHENA_WORKGROUP || 'fca-cost-workgroup';
const DATABASE = process.env.ATHENA_DATABASE || 'fca_cost_reports';
const TABLE = process.env.ATHENA_TABLE || 'cost_and_usage';

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 1000;

interface CostRow {
  service: string;
  cost: number;
  usageType?: string;
  description?: string;
  resourceId?: string;
  date?: string;
}

interface CostSummary {
  totalCost: number;
  netCost: number;
  previousPeriodCost: number;
  projectedMonthlyCost: number;
  serviceBreakdown: Array<{ service: string; cost: number }>;
  period: { start: string; end: string };
}

interface CostOverTime {
  date: string;
  cost: number;
  service?: string;
}

// Simple in-memory cache (1hr TTL)
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function executeQuery(sql: string): Promise<string[][]> {
  const start = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: sql,
      WorkGroup: WORKGROUP,
      QueryExecutionContext: { Database: DATABASE },
    })
  );

  const queryId = start.QueryExecutionId!;

  // Poll for completion
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const status = await athena.send(
      new GetQueryExecutionCommand({ QueryExecutionId: queryId })
    );

    const state = status.QueryExecution?.Status?.State;
    if (state === QueryExecutionState.SUCCEEDED) break;
    if (state === QueryExecutionState.FAILED || state === QueryExecutionState.CANCELLED) {
      throw new Error(
        `Athena query ${state}: ${status.QueryExecution?.Status?.StateChangeReason || 'unknown error'}`
      );
    }
  }

  // Fetch results
  const results = await athena.send(
    new GetQueryResultsCommand({ QueryExecutionId: queryId })
  );

  const rows = results.ResultSet?.Rows || [];
  // Skip header row
  return rows.slice(1).map((row) =>
    (row.Data || []).map((col) => col.VarCharValue || '')
  );
}

export const costService = {
  async getSummary(startDate: string, endDate: string): Promise<CostSummary> {
    const cacheKey = `summary:${startDate}:${endDate}`;
    const cached = getCached<CostSummary>(cacheKey);
    if (cached) return cached;

    // Current period: gross (usage only) and net (all line items including credits)
    const totalRows = await executeQuery(`
      SELECT
        COALESCE(SUM(CASE WHEN line_item_line_item_type IN ('Usage', 'DiscountedUsage', 'SavingsPlanCoveredUsage', 'Fee', 'Tax') THEN line_item_unblended_cost ELSE 0 END), 0) as gross_cost,
        COALESCE(SUM(line_item_unblended_cost), 0) as net_cost
      FROM ${TABLE}
      WHERE line_item_usage_start_date >= TIMESTAMP '${startDate}'
        AND line_item_usage_start_date < TIMESTAMP '${endDate}'
    `);

    const grossCost = parseFloat(totalRows[0]?.[0] || '0');
    const netCost = parseFloat(totalRows[0]?.[1] || '0');

    // Projected monthly cost based on daily run rate
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const daysInPeriod = (endMs - startMs) / (24 * 60 * 60 * 1000);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyRate = netCost / Math.max(1, daysInPeriod);
    const projectedMonthlyCost = Math.round(dailyRate * daysInMonth * 100) / 100;

    // Previous period (same duration, shifted back)
    const durationMs = endMs - startMs;
    const prevStart = new Date(startMs - durationMs).toISOString().split('T')[0];
    const prevEnd = startDate;

    const prevRows = await executeQuery(`
      SELECT COALESCE(SUM(line_item_unblended_cost), 0) as total_cost
      FROM ${TABLE}
      WHERE line_item_usage_start_date >= TIMESTAMP '${prevStart}'
        AND line_item_usage_start_date < TIMESTAMP '${prevEnd}'
    `);

    // Service breakdown
    const serviceRows = await executeQuery(`
      SELECT line_item_product_code, ROUND(SUM(line_item_unblended_cost), 4) as cost
      FROM ${TABLE}
      WHERE line_item_usage_start_date >= TIMESTAMP '${startDate}'
        AND line_item_usage_start_date < TIMESTAMP '${endDate}'
        AND line_item_line_item_type IN ('Usage', 'DiscountedUsage', 'SavingsPlanCoveredUsage', 'Fee', 'Tax')
      GROUP BY line_item_product_code
      ORDER BY cost DESC
    `);

    const result: CostSummary = {
      totalCost: grossCost,
      netCost,
      previousPeriodCost: parseFloat(prevRows[0]?.[0] || '0'),
      projectedMonthlyCost,
      serviceBreakdown: serviceRows.map(([service, cost]) => ({
        service,
        cost: parseFloat(cost),
      })),
      period: { start: startDate, end: endDate },
    };

    setCache(cacheKey, result);
    return result;
  },

  async getByService(startDate: string, endDate: string): Promise<CostRow[]> {
    const cacheKey = `by-service:${startDate}:${endDate}`;
    const cached = getCached<CostRow[]>(cacheKey);
    if (cached) return cached;

    const rows = await executeQuery(`
      SELECT
        line_item_product_code,
        ROUND(SUM(line_item_unblended_cost), 4) as cost,
        line_item_usage_type,
        line_item_line_item_description
      FROM ${TABLE}
      WHERE line_item_usage_start_date >= TIMESTAMP '${startDate}'
        AND line_item_usage_start_date < TIMESTAMP '${endDate}'
        AND line_item_line_item_type IN ('Usage', 'DiscountedUsage', 'SavingsPlanCoveredUsage', 'Fee', 'Tax')
        AND line_item_unblended_cost > 0
      GROUP BY line_item_product_code, line_item_usage_type, line_item_line_item_description
      ORDER BY cost DESC
      LIMIT 100
    `);

    const result = rows.map(([service, cost, usageType, description]) => ({
      service,
      cost: parseFloat(cost),
      usageType,
      description,
    }));

    setCache(cacheKey, result);
    return result;
  },

  async getByResource(startDate: string, endDate: string, service?: string): Promise<CostRow[]> {
    const cacheKey = `by-resource:${startDate}:${endDate}:${service || 'all'}`;
    const cached = getCached<CostRow[]>(cacheKey);
    if (cached) return cached;

    const serviceFilter = service
      ? `AND line_item_product_code = '${service.replace(/'/g, "''")}'`
      : '';

    const rows = await executeQuery(`
      SELECT
        line_item_product_code,
        ROUND(SUM(line_item_unblended_cost), 4) as cost,
        line_item_resource_id,
        line_item_usage_type,
        line_item_line_item_description
      FROM ${TABLE}
      WHERE line_item_usage_start_date >= TIMESTAMP '${startDate}'
        AND line_item_usage_start_date < TIMESTAMP '${endDate}'
        AND line_item_line_item_type IN ('Usage', 'DiscountedUsage', 'SavingsPlanCoveredUsage', 'Fee', 'Tax')
        AND line_item_unblended_cost > 0
        ${serviceFilter}
      GROUP BY line_item_product_code, line_item_resource_id, line_item_usage_type, line_item_line_item_description
      ORDER BY cost DESC
      LIMIT 100
    `);

    const result = rows.map(([svc, cost, resourceId, usageType, description]) => ({
      service: svc,
      cost: parseFloat(cost),
      resourceId: resourceId || undefined,
      usageType,
      description,
    }));

    setCache(cacheKey, result);
    return result;
  },

  async getOverTime(startDate: string, endDate: string, granularity: 'daily' | 'monthly' = 'daily'): Promise<CostOverTime[]> {
    const cacheKey = `over-time:${startDate}:${endDate}:${granularity}`;
    const cached = getCached<CostOverTime[]>(cacheKey);
    if (cached) return cached;

    const dateExpr = granularity === 'monthly'
      ? "DATE_FORMAT(line_item_usage_start_date, '%Y-%m-01')"
      : "DATE_FORMAT(line_item_usage_start_date, '%Y-%m-%d')";

    const rows = await executeQuery(`
      SELECT
        ${dateExpr} as usage_date,
        ROUND(SUM(line_item_unblended_cost), 4) as cost
      FROM ${TABLE}
      WHERE line_item_usage_start_date >= TIMESTAMP '${startDate}'
        AND line_item_usage_start_date < TIMESTAMP '${endDate}'
        AND line_item_line_item_type IN ('Usage', 'DiscountedUsage', 'SavingsPlanCoveredUsage', 'Fee', 'Tax')
      GROUP BY ${dateExpr}
      ORDER BY usage_date
    `);

    const result = rows.map(([date, cost]) => ({
      date,
      cost: parseFloat(cost),
    }));

    setCache(cacheKey, result);
    return result;
  },

  async getOverTimeByService(startDate: string, endDate: string): Promise<CostOverTime[]> {
    const cacheKey = `over-time-service:${startDate}:${endDate}`;
    const cached = getCached<CostOverTime[]>(cacheKey);
    if (cached) return cached;

    const rows = await executeQuery(`
      SELECT
        DATE_FORMAT(line_item_usage_start_date, '%Y-%m-%d') as usage_date,
        line_item_product_code,
        ROUND(SUM(line_item_unblended_cost), 4) as cost
      FROM ${TABLE}
      WHERE line_item_usage_start_date >= TIMESTAMP '${startDate}'
        AND line_item_usage_start_date < TIMESTAMP '${endDate}'
        AND line_item_line_item_type IN ('Usage', 'DiscountedUsage', 'SavingsPlanCoveredUsage', 'Fee', 'Tax')
        AND line_item_unblended_cost > 0
      GROUP BY DATE_FORMAT(line_item_usage_start_date, '%Y-%m-%d'), line_item_product_code
      ORDER BY usage_date, cost DESC
    `);

    const result = rows.map(([date, service, cost]) => ({
      date,
      service,
      cost: parseFloat(cost),
    }));

    setCache(cacheKey, result);
    return result;
  },
};
