import type { LeadPipelineStatus } from '@/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const STATUS_CONFIG: Record<LeadPipelineStatus, { color: string; label: string; pulse: boolean } | null> = {
  idle: null,
  queued_for_scrape:        { color: 'bg-yellow-400', label: 'Queued for scrape', pulse: false },
  scraping:                 { color: 'bg-blue-500',   label: 'Scraping...', pulse: true },
  queued_for_scoring:       { color: 'bg-orange-400', label: 'Queued for scoring', pulse: false },
  scoring:                  { color: 'bg-purple-500', label: 'Scoring...', pulse: true },
  scrape_failed:            { color: 'bg-red-500',    label: 'Scrape failed', pulse: false },
  scoring_failed:           { color: 'bg-red-500',    label: 'Scoring failed', pulse: false },
};

interface PipelineStatusDotProps {
  status: LeadPipelineStatus;
  scrapeError?: string | null;
  scoringError?: string | null;
}

export function PipelineStatusDot({ status, scrapeError, scoringError }: PipelineStatusDotProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  let tooltipText = config.label;
  if (status === 'scrape_failed' && scrapeError) {
    tooltipText = `Scrape failed: ${scrapeError}`;
  } else if (status === 'scoring_failed' && scoringError) {
    tooltipText = `Scoring failed: ${scoringError}`;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${config.color}${config.pulse ? ' animate-pulse' : ''}`}
            aria-label={config.label}
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
