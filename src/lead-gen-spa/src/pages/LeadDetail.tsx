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
  Mail,
  Users,
  TrendingUp,
  FileSearch,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import type { LeadWithCampaign } from '@/types';

/** Build per-page extraction summary for a scrape run (nested event log) */
function getExtractedByPage(lead: LeadWithCampaign, runId: string): Map<string, { emails: string[]; phones: string[]; social: { platform: string; url: string }[]; team: { name: string; title: string | null }[]; acquisition: { text: string }[] }> {
  const byPage = new Map<string, { emails: string[]; phones: string[]; social: { platform: string; url: string }[]; team: { name: string; title: string | null }[]; acquisition: { text: string }[] }>();
  const add = (pageId: string) => {
    if (!byPage.has(pageId)) byPage.set(pageId, { emails: [], phones: [], social: [], team: [], acquisition: [] });
    return byPage.get(pageId)!;
  };
  for (const e of lead.leadEmails ?? []) {
    if (e.sourceRunId === runId) add(e.sourcePageId).emails.push(e.value);
  }
  for (const p of lead.leadPhones ?? []) {
    if (p.sourceRunId === runId) add(p.sourcePageId).phones.push(p.value);
  }
  for (const s of lead.leadSocialProfiles ?? []) {
    if (s.sourceRunId === runId) add(s.sourcePageId).social.push({ platform: s.platform, url: s.url });
  }
  for (const t of lead.leadTeamMembers ?? []) {
    if (t.sourceRunId === runId) add(t.sourcePageId).team.push({ name: t.name, title: t.title });
  }
  for (const a of lead.leadAcquisitionSignals ?? []) {
    if (a.sourceRunId === runId) add(a.sourcePageId).acquisition.push({ text: a.text });
  }
  return byPage;
}

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

          {/* Scrape-derived fields */}
          {(lead.foundedYear != null || lead.yearsInBusiness != null || lead.headcountEstimate != null || lead.hasAcquisitionSignal || lead.contactPageUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  Scraped Business Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {lead.foundedYear != null && <p>Founded: {lead.foundedYear}</p>}
                {lead.yearsInBusiness != null && <p>Years in business: {lead.yearsInBusiness}</p>}
                {lead.headcountEstimate != null && <p>Headcount estimate: {lead.headcountEstimate}</p>}
                {lead.hasAcquisitionSignal && <p className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Has acquisition signal</p>}
                {lead.acquisitionSummary && <p className="text-muted-foreground">{lead.acquisitionSummary}</p>}
                {lead.contactPageUrl && (
                  <a href={lead.contactPageUrl.startsWith('http') ? lead.contactPageUrl : `${lead.website}${lead.contactPageUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Contact page <ExternalLink className="h-3 w-3 inline" />
                  </a>
                )}
                {lead.webScrapedAt && <p className="text-muted-foreground text-xs">Last scraped: {formatDate(lead.webScrapedAt)}</p>}
              </CardContent>
            </Card>
          )}

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
                    {[lead.city, lead.state, lead.zipCode].filter(Boolean).join(', ') || '—'}
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
              {lead.googleMapsUri && (
                <div className="text-sm">
                  <a
                    href={lead.googleMapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Open on Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                <p>Added: {formatDate(lead.createdAt)}</p>
                <p>Source: {lead.source || 'google_maps'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Extracted Data (emails, phones, social, team, acquisition) */}
        {(lead.leadEmails?.length || lead.leadPhones?.length || lead.leadSocialProfiles?.length || lead.leadTeamMembers?.length || lead.leadAcquisitionSignals?.length) ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Extracted Data (from scrape)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.leadEmails?.length ? (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1 mb-2"><Mail className="h-3 w-3" /> Emails</h4>
                  <ul className="space-y-1 text-sm">
                    {lead.leadEmails.map((e) => (
                      <li key={e.id}>
                        <a href={`mailto:${e.value}`} className="text-primary hover:underline">{e.value}</a>
                        {e.sourcePage?.url && <span className="text-muted-foreground text-xs ml-1">(from {e.sourcePage.url})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {lead.leadPhones?.length ? (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1 mb-2"><Phone className="h-3 w-3" /> Phones</h4>
                  <ul className="space-y-1 text-sm">
                    {lead.leadPhones.map((p) => (
                      <li key={p.id}>
                        <a href={`tel:${p.value}`} className="text-primary hover:underline">{p.value}</a>
                        {p.sourcePage?.url && <span className="text-muted-foreground text-xs ml-1">(from {p.sourcePage.url})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {lead.leadSocialProfiles?.length ? (
                <div>
                  <h4 className="text-sm font-medium mb-2">Social Profiles</h4>
                  <ul className="space-y-1 text-sm">
                    {lead.leadSocialProfiles.map((s) => (
                      <li key={s.id}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.platform}: {s.url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {lead.leadTeamMembers?.length ? (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1 mb-2"><Users className="h-3 w-3" /> Team Members</h4>
                  <ul className="space-y-1 text-sm">
                    {lead.leadTeamMembers.map((t) => (
                      <li key={t.id}>{t.name}{t.title ? ` — ${t.title}` : ''}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {lead.leadAcquisitionSignals?.length ? (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1 mb-2"><TrendingUp className="h-3 w-3" /> Acquisition Signals</h4>
                  <ul className="space-y-1 text-sm">
                    {lead.leadAcquisitionSignals.map((a) => (
                      <li key={a.id} className="rounded bg-muted/50 p-2">{a.text}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {/* Scrape Run Tree */}
        {lead.scrapeRuns?.length ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Scrape Run History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.scrapeRuns.map((run) => {
                const extractedByPage = getExtractedByPage(lead, run.id);
                return (
                  <div key={run.id} className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      {formatDate(run.startedAt)} — {run.status} — {run.methodSummary ?? 'scrape'}
                      {(run.pagesCount != null || run.durationMs != null) && (
                        <span className="ml-2">
                          ({run.pagesCount != null ? `${run.pagesCount} pages` : ''}
                          {run.pagesCount != null && run.durationMs != null ? ', ' : ''}
                          {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : ''})
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">Root: {run.rootUrl}</div>
                    {run.scrapedPages?.length ? (
                      <ul className="mt-2 space-y-2 text-sm">
                        {run.scrapedPages.map((p) => {
                          const ex = extractedByPage.get(p.id);
                          const hasExtracted = ex && (ex.emails.length || ex.phones.length || ex.social.length || ex.team.length || ex.acquisition.length);
                          return (
                            <li key={p.id} className="space-y-1" style={{ paddingLeft: (p.depth ?? 0) * 12 }}>
                              <div className="flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-3xl block">{p.url}</a>
                                {(p.statusCode == null || p.statusCode >= 400) && (
                                  <Badge variant="destructive" className="shrink-0 text-xs">failed</Badge>
                                )}
                              </div>
                              {hasExtracted && (
                                <ul className="ml-4 space-y-0.5 text-xs text-muted-foreground border-l border-muted pl-2">
                                  {ex!.emails.map((v) => (
                                    <li key={v} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> email: {v}</li>
                                  ))}
                                  {ex!.phones.map((v) => (
                                    <li key={v} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> phone: {v}</li>
                                  ))}
                                  {ex!.social.map((s) => (
                                    <li key={s.url} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> {s.platform}: {s.url}</li>
                                  ))}
                                  {ex!.team.map((t, ti) => (
                                    <li key={ti} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> team: {t.name}{t.title ? ` — ${t.title}` : ''}</li>
                                  ))}
                                  {ex!.acquisition.map((a, i) => (
                                    <li key={i} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> acquisition: {a.text}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        No page tree for this run. Re-scrape this lead to capture the full link tree.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

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
