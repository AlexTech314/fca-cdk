import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Campaign } from '@/types';
import { Play, AlertCircle } from 'lucide-react';

interface RunCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onConfirm: () => void;
  isLoading: boolean;
}

export function RunCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onConfirm,
  isLoading,
}: RunCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run Campaign</DialogTitle>
          <DialogDescription>
            You're about to run the campaign "{campaign.name}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Queries to execute</span>
              <Badge variant="secondary" className="font-mono">
                {campaign.queries.length.toLocaleString()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Max results per query</span>
              <Badge variant="secondary" className="font-mono">
                {campaign.maxResultsPerSearch ?? 60}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Request budget</span>
              <Badge variant="secondary" className="font-mono">
                {campaign.maxTotalRequests ? campaign.maxTotalRequests.toLocaleString() : 'Unlimited'}
              </Badge>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-warning">Usage Note</p>
              <p className="text-muted-foreground mt-1">
                {campaign.maxTotalRequests
                  ? `This run will execute up to ${campaign.maxTotalRequests.toLocaleString()} API requests across ${campaign.queries.length.toLocaleString()} queries. This action cannot be undone.`
                  : `No request budget is set. Each query will paginate until an empty page is returned or the per-query limit of ${campaign.maxResultsPerSearch ?? 60} results is reached. This action cannot be undone.`}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            <Play className="mr-2 h-4 w-4" />
            {isLoading ? 'Starting...' : 'Start Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
