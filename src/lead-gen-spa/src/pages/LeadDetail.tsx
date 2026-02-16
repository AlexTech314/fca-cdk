import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QualificationBadge } from '@/components/leads/QualificationBadge';
import { useLead, useQualifyLead } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatNumber } from '@/lib/utils';
import { 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  Target,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading } = useLead(id || '');
  const qualifyMutation = useQualifyLead();
  const { canWrite } = useAuth();

  if (isLoading) {
    return (
      <>
        <Header breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: 'Loading...' },
        ]} />
        <PageContainer>
          <div className="grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  if (!lead) {
    return (
      <PageContainer title="Lead Not Found">
        <p className="text-muted-foreground">The requested lead could not be found.</p>
        <Button asChild className="mt-4">
          <Link to="/leads">Back to Leads</Link>
        </Button>
      </PageContainer>
    );
  }

  const handleQualify = () => {
    if (lead) {
      qualifyMutation.mutate(lead.id);
    }
  };

  return (
    <>
      <Header 
        breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: lead.name },
        ]}
        actions={
          canWrite && (
            <Button 
              onClick={handleQualify}
              disabled={qualifyMutation.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {qualifyMutation.isPending ? 'Qualifying...' : 'Re-Qualify'}
            </Button>
          )
        }
      />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{lead.name}</h3>
                {lead.franchise && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Location of: {lead.franchise.displayName ?? lead.franchise.name}
                  </p>
                )}
                {lead.businessType && (
                  <Badge variant="secondary" className="mt-1">
                    {lead.businessType}
                  </Badge>
                )}
              </div>

              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="hover:text-primary">
                    {lead.phone}
                  </a>
                </div>
              )}

              {lead.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={lead.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary flex items-center gap-1"
                  >
                    {lead.website.replace(/^https?:\/\//, '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  {lead.address && <p>{lead.address}</p>}
                  <p>
                    {lead.city}, {lead.state} {lead.zipCode}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Google Maps Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.rating !== null && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-warning fill-warning" />
                  <span className="font-mono font-semibold">{lead.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({formatNumber(lead.reviewCount || 0)} reviews)
                  </span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <p>Added: {formatDate(lead.createdAt)}</p>
                <p>Source: {lead.source || 'google_maps'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Source & Qualification */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Source Campaign */}
          {lead.campaign && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Source Campaign
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  to={`/campaigns/${lead.campaign.id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {lead.campaign.name}
                </Link>
                {lead.campaign.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lead.campaign.description}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Qualification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Qualification
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.qualificationScore !== null ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <QualificationBadge score={lead.qualificationScore} size="lg" />
                    <span className="text-sm text-muted-foreground">
                      Qualified on {formatDate(lead.qualifiedAt || lead.updatedAt)}
                    </span>
                  </div>
                  {lead.qualificationNotes && (
                    <div className="mt-3 rounded-lg bg-muted p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans">
                        {lead.qualificationNotes}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <p>This lead has not been qualified yet.</p>
                  {canWrite && (
                    <Button 
                      onClick={handleQualify} 
                      className="mt-3"
                      disabled={qualifyMutation.isPending}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Qualify Now
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
