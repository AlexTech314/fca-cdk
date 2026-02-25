import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QualificationBadge } from '@/components/leads/QualificationBadge';
import { useLead, useQualifyLead, useDeleteScrapeRun, useDeleteScrapedPage, useDeleteLeadData, useUpdateLeadData } from '@/hooks/useLeads';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatNumber } from '@/lib/utils';
import type { LeadDataType } from '@/lib/api/types';
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
  Trash2,
  Pencil,
} from 'lucide-react';
import type { LeadWithCampaign } from '@/types';

interface PageExtraction {
  emails: { id: string; value: string }[];
  phones: { id: string; value: string }[];
  social: { id: string; platform: string; url: string }[];
  team: { id: string; name: string; title: string | null }[];
  acquisition: { id: string; text: string }[];
  snippets: { id: string; category: string; text: string }[];
}

/** Build per-page extraction summary for a scrape run (nested event log) */
function getExtractedByPage(lead: LeadWithCampaign, runId: string): Map<string, PageExtraction> {
  const byPage = new Map<string, PageExtraction>();
  const add = (pageId: string) => {
    if (!byPage.has(pageId)) byPage.set(pageId, { emails: [], phones: [], social: [], team: [], acquisition: [], snippets: [] });
    return byPage.get(pageId)!;
  };
  for (const e of lead.leadEmails ?? []) {
    if (e.sourceRunId === runId) add(e.sourcePageId).emails.push({ id: e.id, value: e.value });
  }
  for (const p of lead.leadPhones ?? []) {
    if (p.sourceRunId === runId) add(p.sourcePageId).phones.push({ id: p.id, value: p.value });
  }
  for (const s of lead.leadSocialProfiles ?? []) {
    if (s.sourceRunId === runId) add(s.sourcePageId).social.push({ id: s.id, platform: s.platform, url: s.url });
  }
  for (const t of lead.leadTeamMembers ?? []) {
    if (t.sourceRunId === runId) add(t.sourcePageId).team.push({ id: t.id, name: t.name, title: t.title });
  }
  for (const a of lead.leadAcquisitionSignals ?? []) {
    if (a.sourceRunId === runId) add(a.sourcePageId).acquisition.push({ id: a.id, text: a.text });
  }
  for (const sn of lead.leadSnippets ?? []) {
    if (sn.sourceRunId === runId) add(sn.sourcePageId).snippets.push({ id: sn.id, category: sn.category, text: sn.text });
  }
  return byPage;
}

/** Inline edit form for a single extracted data item */
function InlineEditForm({ type, initial, onSave, onCancel }: {
  type: LeadDataType;
  initial: Record<string, string>;
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(values);
  };

  const fields: { key: string; placeholder: string }[] = (() => {
    switch (type) {
      case 'email': return [{ key: 'value', placeholder: 'Email' }];
      case 'phone': return [{ key: 'value', placeholder: 'Phone' }];
      case 'social': return [{ key: 'platform', placeholder: 'Platform' }, { key: 'url', placeholder: 'URL' }];
      case 'team': return [{ key: 'name', placeholder: 'Name' }, { key: 'title', placeholder: 'Title' }];
      case 'acquisition': return [{ key: 'text', placeholder: 'Signal text' }];
      case 'snippet': return [{ key: 'text', placeholder: 'Snippet text' }];
    }
  })();

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

  const handleDeleteData = (type: LeadDataType, dataId: string) => {
    deleteDataMutation.mutateAsync({ type, id: dataId }).then(
      () => toast({ title: `Deleted ${type}` }),
      () => toast({ title: `Failed to delete ${type}`, variant: 'destructive' })
    );
  };

  const handleUpdateData = (type: LeadDataType, dataId: string, data: Record<string, unknown>) => {
    updateDataMutation.mutateAsync({ type, id: dataId, data }).then(
      () => { setEditingId(null); toast({ title: `Updated ${type}` }); },
      () => toast({ title: `Failed to update ${type}`, variant: 'destructive' })
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
                      <li key={e.id} className="group flex items-center gap-1">
                        {editingId === e.id ? (
                          <InlineEditForm
                            type="email"
                            initial={{ value: e.value }}
                            onSave={(data) => handleUpdateData('email', e.id, data)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <a href={`mailto:${e.value}`} className="text-primary hover:underline">{e.value}</a>
                            {e.sourcePage?.url && <span className="text-muted-foreground text-xs ml-1">(from {e.sourcePage.url})</span>}
                            <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(e.id)} onDelete={() => handleDeleteData('email', e.id)} isPending={isMutating} />
                          </>
                        )}
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
                      <li key={p.id} className="group flex items-center gap-1">
                        {editingId === p.id ? (
                          <InlineEditForm
                            type="phone"
                            initial={{ value: p.value }}
                            onSave={(data) => handleUpdateData('phone', p.id, data)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <a href={`tel:${p.value}`} className="text-primary hover:underline">{p.value}</a>
                            {p.sourcePage?.url && <span className="text-muted-foreground text-xs ml-1">(from {p.sourcePage.url})</span>}
                            <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(p.id)} onDelete={() => handleDeleteData('phone', p.id)} isPending={isMutating} />
                          </>
                        )}
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
                      <li key={s.id} className="group flex items-center gap-1">
                        {editingId === s.id ? (
                          <InlineEditForm
                            type="social"
                            initial={{ platform: s.platform, url: s.url }}
                            onSave={(data) => handleUpdateData('social', s.id, data)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{s.platform}: {s.url}</a>
                            <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(s.id)} onDelete={() => handleDeleteData('social', s.id)} isPending={isMutating} />
                          </>
                        )}
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
                      <li key={t.id} className="group flex items-center gap-1">
                        {editingId === t.id ? (
                          <InlineEditForm
                            type="team"
                            initial={{ name: t.name, title: t.title ?? '' }}
                            onSave={(data) => handleUpdateData('team', t.id, { ...data, title: data.title || null })}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <span>{t.name}{t.title ? ` — ${t.title}` : ''}</span>
                            <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(t.id)} onDelete={() => handleDeleteData('team', t.id)} isPending={isMutating} />
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {lead.leadAcquisitionSignals?.length ? (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1 mb-2"><TrendingUp className="h-3 w-3" /> Acquisition Signals</h4>
                  <ul className="space-y-1 text-sm">
                    {lead.leadAcquisitionSignals.map((a) => (
                      <li key={a.id} className="group flex items-center gap-1">
                        {editingId === a.id ? (
                          <InlineEditForm
                            type="acquisition"
                            initial={{ text: a.text }}
                            onSave={(data) => handleUpdateData('acquisition', a.id, data)}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <>
                            <span className="rounded bg-muted/50 p-2">{a.text}</span>
                            <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(a.id)} onDelete={() => handleDeleteData('acquisition', a.id)} isPending={isMutating} />
                          </>
                        )}
                      </li>
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
                          const ex = extractedByPage.get(p.id);
                          const hasExtracted = ex && (ex.emails.length || ex.phones.length || ex.social.length || ex.team.length || ex.acquisition.length || ex.snippets.length);
                          return (
                            <li key={p.id} className="space-y-1" style={{ paddingLeft: (p.depth ?? 0) * 12 }}>
                              <div className="group flex items-center gap-1">
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-3xl block">{p.url}</a>
                                {(p.statusCode == null || p.statusCode >= 400) && (
                                  <Badge variant="destructive" className="shrink-0 text-xs">failed</Badge>
                                )}
                                {canWrite && (
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center ml-1 shrink-0">
                                    <button
                                      onClick={() => handleDeletePage(p.id)}
                                      className="text-muted-foreground hover:text-destructive p-0.5"
                                      disabled={isMutating}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </span>
                                )}
                              </div>
                              {hasExtracted && (
                                <ul className="ml-4 space-y-0.5 text-xs text-muted-foreground border-l border-muted pl-2">
                                  {ex!.emails.map((v) => (
                                    <li key={v.id} className="group flex items-center gap-1">
                                      {editingId === v.id ? (
                                        <InlineEditForm
                                          type="email"
                                          initial={{ value: v.value }}
                                          onSave={(data) => handleUpdateData('email', v.id, data)}
                                          onCancel={() => setEditingId(null)}
                                        />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> email: {v.value}
                                          <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(v.id)} onDelete={() => handleDeleteData('email', v.id)} isPending={isMutating} />
                                        </>
                                      )}
                                    </li>
                                  ))}
                                  {ex!.phones.map((v) => (
                                    <li key={v.id} className="group flex items-center gap-1">
                                      {editingId === v.id ? (
                                        <InlineEditForm
                                          type="phone"
                                          initial={{ value: v.value }}
                                          onSave={(data) => handleUpdateData('phone', v.id, data)}
                                          onCancel={() => setEditingId(null)}
                                        />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> phone: {v.value}
                                          <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(v.id)} onDelete={() => handleDeleteData('phone', v.id)} isPending={isMutating} />
                                        </>
                                      )}
                                    </li>
                                  ))}
                                  {ex!.social.map((s) => (
                                    <li key={s.id} className="group flex items-center gap-1">
                                      {editingId === s.id ? (
                                        <InlineEditForm
                                          type="social"
                                          initial={{ platform: s.platform, url: s.url }}
                                          onSave={(data) => handleUpdateData('social', s.id, data)}
                                          onCancel={() => setEditingId(null)}
                                        />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> {s.platform}: {s.url}
                                          <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(s.id)} onDelete={() => handleDeleteData('social', s.id)} isPending={isMutating} />
                                        </>
                                      )}
                                    </li>
                                  ))}
                                  {ex!.team.map((t) => (
                                    <li key={t.id} className="group flex items-center gap-1">
                                      {editingId === t.id ? (
                                        <InlineEditForm
                                          type="team"
                                          initial={{ name: t.name, title: t.title ?? '' }}
                                          onSave={(data) => handleUpdateData('team', t.id, { ...data, title: data.title || null })}
                                          onCancel={() => setEditingId(null)}
                                        />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> team: {t.name}{t.title ? ` — ${t.title}` : ''}
                                          <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(t.id)} onDelete={() => handleDeleteData('team', t.id)} isPending={isMutating} />
                                        </>
                                      )}
                                    </li>
                                  ))}
                                  {ex!.acquisition.map((a) => (
                                    <li key={a.id} className="group flex items-center gap-1">
                                      {editingId === a.id ? (
                                        <InlineEditForm
                                          type="acquisition"
                                          initial={{ text: a.text }}
                                          onSave={(data) => handleUpdateData('acquisition', a.id, data)}
                                          onCancel={() => setEditingId(null)}
                                        />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" /> acquisition: {a.text}
                                          <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(a.id)} onDelete={() => handleDeleteData('acquisition', a.id)} isPending={isMutating} />
                                        </>
                                      )}
                                    </li>
                                  ))}
                                  {ex!.snippets.map((s) => (
                                    <li key={s.id} className="group flex items-center gap-1">
                                      {editingId === s.id ? (
                                        <InlineEditForm
                                          type="snippet"
                                          initial={{ text: s.text }}
                                          onSave={(data) => handleUpdateData('snippet', s.id, data)}
                                          onCancel={() => setEditingId(null)}
                                        />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" /> {s.category}: {s.text}
                                          <DataRowActions canWrite={canWrite} onEdit={() => setEditingId(s.id)} onDelete={() => handleDeleteData('snippet', s.id)} isPending={isMutating} />
                                        </>
                                      )}
                                    </li>
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
