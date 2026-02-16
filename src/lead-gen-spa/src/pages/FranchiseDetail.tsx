import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFranchise } from '@/hooks/useFranchises';
import { ExternalLink } from 'lucide-react';

export default function FranchiseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: franchise, isLoading } = useFranchise(id || '');

  if (isLoading) {
    return (
      <>
        <Header breadcrumbs={[
          { label: 'Franchises', href: '/franchises' },
          { label: 'Loading...' },
        ]} />
        <PageContainer>
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  if (!franchise) {
    return (
      <PageContainer title="Franchise Not Found">
        <p className="text-muted-foreground">The requested franchise could not be found.</p>
        <Button asChild className="mt-4">
          <Link to="/franchises">Back to Franchises</Link>
        </Button>
      </PageContainer>
    );
  }

  const displayName = franchise.displayName ?? franchise.name;

  return (
    <>
      <Header
        breadcrumbs={[
          { label: 'Franchises', href: '/franchises' },
          { label: displayName },
        ]}
      />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Franchise Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <h3 className="text-lg font-semibold">{displayName}</h3>
                {franchise.displayName && (
                  <p className="text-sm text-muted-foreground mt-0.5">Normalized: {franchise.name}</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {franchise.leads?.length ?? franchise.locationCount ?? 0} locations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This franchise groups all leads (locations) that share the same business name.
                Each row below is a distinct location discovered by the places task.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {!franchise.leads?.length ? (
              <p className="text-muted-foreground text-sm">No locations found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Website</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franchise.leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Link
                          to={`/leads/${lead.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {lead.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{lead.city ?? '-'}</TableCell>
                      <TableCell>
                        {lead.state && <Badge variant="outline">{lead.state}</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{lead.phone ?? '-'}</TableCell>
                      <TableCell>
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Link <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
