import type { TopPage } from '@/types';
import { formatNumber } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface TopPagesTableProps {
  pages: TopPage[];
  isLoading?: boolean;
}

export function TopPagesTable({ pages, isLoading }: TopPagesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!pages || pages.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No page data available
      </div>
    );
  }

  const maxViews = Math.max(...pages.map((p) => p.views));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          <TableHead>Page</TableHead>
          <TableHead className="text-right w-[100px]">Views</TableHead>
          <TableHead className="w-[200px]">Distribution</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pages.map((page, index) => (
          <TableRow key={page.path}>
            <TableCell className="font-mono text-muted-foreground">
              {index + 1}
            </TableCell>
            <TableCell>
              <div>
                <p className="font-medium">{page.title || page.path}</p>
                <p className="text-sm text-muted-foreground">{page.path}</p>
              </div>
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatNumber(page.views)}
            </TableCell>
            <TableCell>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                  style={{ width: `${(page.views / maxViews) * 100}%` }}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
