import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useFranchises } from '@/hooks/useFranchises';
import type { Franchise } from '@/types';
import { MapPin } from 'lucide-react';

interface FranchiseTableProps {
  data: Franchise[];
  isLoading: boolean;
}

function FranchiseTable({ data, isLoading }: FranchiseTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Franchise</TableHead>
            <TableHead>Locations</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-12">
                No franchises yet. Franchises are created automatically when the places task
                discovers multiple locations with the same business name.
              </TableCell>
            </TableRow>
          ) : (
            data.map((franchise) => (
              <TableRow key={franchise.id} className="hover:bg-muted/50">
                <TableCell>
                  <Link
                    to={`/franchises/${franchise.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {franchise.displayName ?? franchise.name}
                  </Link>
                  {franchise.displayName && franchise.displayName !== franchise.name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{franchise.name}</p>
                  )}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {franchise.locationCount ?? 0} locations
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/franchises/${franchise.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function Franchises() {
  const { data: franchises, isLoading } = useFranchises();

  return (
    <PageContainer
      title="Franchises"
      description="Multi-location businesses grouped by name. Each lead is a location; franchises group locations of the same business."
    >
      <FranchiseTable data={franchises || []} isLoading={isLoading} />
    </PageContainer>
  );
}
