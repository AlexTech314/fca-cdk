import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { FileText } from 'lucide-react';

interface ScrapedDataDialogProps {
  leadId: string;
  leadName: string;
  hasData: boolean;
}

export function ScrapedDataDialog({ leadId, leadName, hasData }: ScrapedDataDialogProps) {
  const [open, setOpen] = useState(false);

  const { data: markdown, isLoading, error } = useQuery({
    queryKey: ['lead-scraped-markdown', leadId],
    queryFn: () => api.getLeadScrapedMarkdown(leadId),
    enabled: open,
  });

  if (!hasData) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => setOpen(true)}
      >
        <FileText className="h-3.5 w-3.5" />
        View
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Scraped Data — {leadName}</DialogTitle>
            <DialogDescription>Combined markdown from all scraped pages</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : error ? (
              <p className="text-muted-foreground p-4">
                {error instanceof Error ? error.message : 'Failed to load scraped data.'}
              </p>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                  {markdown}
                </pre>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
