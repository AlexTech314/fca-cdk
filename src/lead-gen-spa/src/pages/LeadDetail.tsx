import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineStatusDot } from '@/components/leads/PipelineStatusDot';
import { ScoreBadge } from '@/components/leads/QualificationBadge';
import { useLead, useQualifyLead, useDeleteScrapeRun, useDeleteScrapedPage, useDeleteLeadData, useUpdateLeadData } from '@/hooks/useLeads';
import { toast } from '@/hooks/use-toast';
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
  FileSearch,
  FileText,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';
import type { LeadWithCampaign, LeadContact } from '@/types';

/** Build per-page contact summary keyed by scrapedPageId */
function getContactsByPage(lead: LeadWithCampaign): Map<string, LeadContact[]> {
  const byPage = new Map<string, LeadContact[]>();
  for (const c of lead.leadContacts ?? []) {
    if (!c.scrapedPageId) continue;
    const arr = byPage.get(c.scrapedPageId) ?? [];
    arr.push(c);
    byPage.set(c.scrapedPageId, arr);
  }
  return byPage;
}

/** Inline edit form for a contact */
function InlineEditForm({ initial, onSave, onCancel }: {
  initial: Record<string, string>;
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(values);
  };

  const fields = Object.keys(initial).map((key) => ({
    key,
    placeholder: key.charAt(0).toUpperCase() + key.slice(1),
  }));

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1 flex-1">
      {fields.map((f) => (
        <input
          key={f.key}
          className="border rounded px-1.5 py-0.5 text-xs bg-background flex-1 min-w-0"
          placeholder={f.placeholder}
          value={values[f.key] ?? ''}
          onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
          autoFocus={f === fields[0]}
        />
      ))}
      <Button type="submit" variant="ghost" size="icon" className="h-5 w-5 shrink-0">
        <CheckCircle2 className="h-3 w-3" />
      </Button>
    </form>
  );
}

/** Hover-reveal action icons for a data row */
function DataRowActions({ canWrite, onEdit, onDelete, isPending }: {
  canWrite: boolean;
  onEdit?: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  if (!canWrite) return null;
  return (
    <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 ml-1 shrink-0">
      {onEdit && (
        <button onClick={onEdit} className="text-muted-foreground hover:text-primary p-0.5" disabled={isPending}>
          <Pencil className="h-3 w-3" />
        </button>
      )}
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-0.5" disabled={isPending}>
        <Trash2 className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading } = useLead(id || '');
  const qualifyMutation = useQualifyLead();
  const deleteScrapeRunMutation = useDeleteScrapeRun();
  const deletePageMutation = useDeleteScrapedPage();
  const deleteDataMutation = useDeleteLeadData();
  const updateDataMutation = useUpdateLeadData();
  const { canWrite } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleDeleteContact = (contactId: string) => {
    deleteDataMutation.mutateAsync({ type: 'contact', id: contactId }).then(
      () => toast({ title: 'Deleted contact' }),
      () => toast({ title: 'Failed to delete contact', variant: 'destructive' })
    );
  };

  const handleUpdateContact = (contactId: string, data: Record<string, unknown>) => {
    updateDataMutation.mutateAsync({ type: 'contact', id: contactId, data }).then(
      () => { setEditingId(null); toast({ title: 'Updated contact' }); },
      () => toast({ title: 'Failed to update contact', variant: 'destructive' })
    );
  };

  const handleDeletePage = (pageId: string) => {
    deletePageMutation.mutateAsync(pageId).then(
      () => toast({ title: 'Scraped page deleted' }),
      () => toast({ title: 'Failed to delete scraped page', variant: 'destructive' })
    );
  };

  const isMutating = deleteDataMutation.isPending || updateDataMutation.isPending || deletePageMutation.isPending;

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
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <PipelineStatusDot status={lead.pipelineStatus} scrapeError={lead.scrapeError} scoringError={lead.scoringError} />
                  {lead.name}
                </h3>
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
              {lead.reviewSummary && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Review Summary</p>
                  <p className="text-sm italic text-muted-foreground">{lead.reviewSummary}</p>
                </div>
              )}
              {lead.editorialSummary && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Editorial Summary</p>
                  <p className="text-sm italic text-muted-foreground">{lead.editorialSummary}</p>
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

        {/* Contacts (extracted from scrape) */}
        {(lead.leadContacts?.length) ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-2 text-sm">
                {lead.leadContacts.map((c) => {
                  const contactName = [c.firstName, c.lastName].filter(Boolean).join(' ');
                  return (
                    <li key={c.id} className="group flex items-center gap-2 flex-wrap">
                      {editingId === c.id ? (
                        <InlineEditForm
                          initial={{
                            ...(c.email ? { email: c.email } : {}),
                            ...(c.phone ? { phone: c.phone } : {}),
                            ...(c.firstName ? { firstName: c.firstName } : {}),
                            ...(c.lastName ? { lastName: c.lastName } : {}),
                          }}
                          onSave={(data) => handleUpdateContact(c.id, data)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          {c.isBestContact && (
                            <Badge variant="default" className="text-[10px] px-1 py-0">best</Badge>
                          )}
                          {contactName && <span className="font-medium">{contactName}</span>}
                          {c.email && <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a>}
                          {c.phone && <a href={`tel:${c.phone}`} className="text-primary hover:underline">{c.phone}</a>}
                          {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">LinkedIn</a>}
                          {c.instagram && <a href={c.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Instagram</a>}
                          {c.facebook && <a href={c.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Facebook</a>}
                          {c.twitter && <a href={c.twitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">Twitter</a>}
                          {c.scrapedPage?.url && <span className="text-muted-foreground text-xs">(from {c.scrapedPage.url})</span>}
                          <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(c.id)} onDelete={() => handleDeleteContact(c.id)} isPending={isMutating} />
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
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
                const contactsByPage = getContactsByPage(lead);
                return (
                  <div key={run.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>
                        {formatDate(run.startedAt)} — {run.status} — {run.methodSummary ?? 'scrape'}
                        {(run.pagesCount != null || run.durationMs != null) && (
                          <span className="ml-2">
                            ({run.pagesCount != null ? `${run.pagesCount} pages` : ''}
                            {run.pagesCount != null && run.durationMs != null ? ', ' : ''}
                            {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : ''})
                          </span>
                        )}
                      </span>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          disabled={deleteScrapeRunMutation.isPending}
                          onClick={() =>
                            deleteScrapeRunMutation.mutateAsync(run.id).then(
                              () => toast({ title: 'Scrape run deleted' }),
                              () => toast({ title: 'Failed to delete scrape run', variant: 'destructive' })
                            )
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">Root: {run.rootUrl}</div>
                    {run.scrapedPages?.length ? (
                      <ul className="mt-2 space-y-2 text-sm">
                        {run.scrapedPages.map((p) => {
                          const pageContacts = contactsByPage.get(p.id);
                          const hasExtracted = pageContacts && pageContacts.length > 0;
                          return (
                            <li key={p.id} className="space-y-1" style={{ paddingLeft: (p.depth ?? 0) * 12 }}>
                              <div className="group flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-3xl block">{p.url}</a>
                                <Link
                                  to={`/leads/${lead.id}/scraped-page/${p.id}/markdown`}
                                  className="text-muted-foreground hover:text-primary p-0.5 shrink-0"
                                  title="View page markdown"
                                >
                                  <FileText className="h-3 w-3" />
                                </Link>
                                {(p.statusCode == null || p.statusCode >= 400) && (
                                  <Badge variant="destructive" className="shrink-0 text-xs">failed</Badge>
                                )}
                                {canWrite && (
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center ml-1 shrink-0">
                                    <button
                                      onClick={() => handleDeletePage(p.id)}
                                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-0.5"
                                      disabled={isMutating}
                                      title="Delete"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                )}
                              </div>
                              {hasExtracted && (
                                <ul className="ml-4 space-y-0.5 text-xs text-muted-foreground border-l border-muted pl-2">
                                  {pageContacts!.map((c) => {
                                    const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
                                    const parts: string[] = [];
                                    if (c.email) parts.push(c.email);
                                    if (c.phone) parts.push(c.phone);
                                    if (c.linkedin) parts.push('LinkedIn');
                                    if (c.facebook) parts.push('Facebook');
                                    if (c.instagram) parts.push('Instagram');
                                    if (c.twitter) parts.push('Twitter');
                                    return (
                                      <li key={c.id} className="group flex items-center gap-1">
                                        {editingId === c.id ? (
                                          <InlineEditForm
                                            initial={{
                                              ...(c.email ? { email: c.email } : {}),
                                              ...(c.phone ? { phone: c.phone } : {}),
                                            }}
                                            onSave={(data) => handleUpdateContact(c.id, data)}
                                            onCancel={() => setEditingId(null)}
                                          />
                                        ) : (
                                          <>
                                            <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                                            {name && <span className="font-medium">{name}</span>}
                                            {name && parts.length > 0 && <span>—</span>}
                                            {parts.join(', ')}
                                            {c.isBestContact && (
                                              <span className="text-[10px] px-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">best</span>
                                            )}
                                            <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(c.id)} onDelete={() => handleDeleteContact(c.id)} isPending={isMutating} />
                                          </>
                                        )}
                                      </li>
                                    );
                                  })}
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
              {lead.scoredAt ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      Scored on {formatDate(lead.scoredAt)}
                    </span>
                  </div>

                  {lead.isExcluded && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Excluded</p>
                      {lead.exclusionReason && (
                        <p className="text-sm text-red-700 dark:text-red-300">{lead.exclusionReason}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Business Quality</p>
                      {lead.businessQualityScore != null && lead.businessQualityScore !== -1
                        ? <ScoreBadge score={lead.businessQualityScore} size="lg" />
                        : <span className="text-muted-foreground text-sm">N/A</span>}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Exit Readiness</p>
                      {lead.exitReadinessScore != null && lead.exitReadinessScore !== -1
                        ? <ScoreBadge score={lead.exitReadinessScore} size="lg" />
                        : <span className="text-muted-foreground text-sm">N/A</span>}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="text-sm font-medium">{lead.controllingOwner || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ownership</p>
                      <p className="text-sm font-medium">{lead.ownershipType || '—'}</p>
                    </div>
                  </div>

                  {(lead.compositeScore != null || lead.tier != null) && (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Priority Score</p>
                        <div className="flex items-center gap-3">
                          {lead.tier != null && (
                            <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                              lead.tier === 1 ? 'bg-green-600 text-white' :
                              lead.tier === 2 ? 'bg-amber-500 text-white' :
                              'bg-gray-400 text-white'
                            }`}>
                              T{lead.tier}
                            </span>
                          )}
                          {lead.compositeScore != null && (
                            <span className={`font-mono text-lg font-bold ${
                              lead.compositeScore >= 700 ? 'text-green-600 dark:text-green-400' :
                              lead.compositeScore >= 500 ? 'text-amber-600 dark:text-amber-400' :
                              lead.compositeScore >= 300 ? 'text-orange-600 dark:text-orange-400' :
                              'text-muted-foreground'
                            }`}>
                              {Math.round(lead.compositeScore)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(() => {
                    const bestContact = lead.leadContacts?.find((c) => c.isBestContact);
                    if (!bestContact) return null;
                    return (
                      <div className="rounded-lg border p-4 space-y-2">
                        <p className="text-sm font-medium">Best Contact</p>
                        {(bestContact.firstName || bestContact.lastName) && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Name</span>
                            <span>{[bestContact.firstName, bestContact.lastName].filter(Boolean).join(' ')}</span>
                          </div>
                        )}
                        {bestContact.email && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Email</span>
                            <a href={`mailto:${bestContact.email}`} className="text-blue-600 hover:underline dark:text-blue-400">{bestContact.email}</a>
                          </div>
                        )}
                        {bestContact.phone && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Phone</span>
                            <a href={`tel:${bestContact.phone}`} className="text-blue-600 hover:underline dark:text-blue-400">{bestContact.phone}</a>
                          </div>
                        )}
                        {bestContact.linkedin && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">LinkedIn</span>
                            <a href={bestContact.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400 truncate max-w-[200px]">{bestContact.linkedin}</a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {lead.scoringRationale && (
                    <div className="rounded-lg bg-muted p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans">
                        {lead.scoringRationale}
                      </pre>
                    </div>
                  )}

                  {lead.supportingEvidence.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Supporting Evidence</p>
                      <ul className="space-y-3">
                        {lead.supportingEvidence.map((ev, i) => (
                          <li key={i} className="border-l-2 border-muted pl-3">
                            <blockquote className="text-sm italic text-muted-foreground mb-1">
                              &ldquo;{ev.snippet}&rdquo;
                            </blockquote>
                            <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline dark:text-blue-400 truncate block">
                              {ev.url}
                            </a>
                          </li>
                        ))}
                      </ul>
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
