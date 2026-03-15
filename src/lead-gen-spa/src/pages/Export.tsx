import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { useLeadCount, useExportLeads } from '@/hooks/useLeads';
import type { LeadFilters as LeadFiltersType } from '@/types';
import { Download, FileSpreadsheet, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Step = 'filters' | 'columns' | 'preview' | 'download';

interface ColumnGroup {
  label: string;
  columns: { key: string; label: string; default: boolean }[];
}

const columnGroups: ColumnGroup[] = [
  {
    label: 'Core Info',
    columns: [
      { key: 'name', label: 'Business Name', default: true },
      { key: 'address', label: 'Address', default: true },
      { key: 'city', label: 'City', default: true },
      { key: 'state', label: 'State', default: true },
      { key: 'zipCode', label: 'Zip Code', default: true },
      { key: 'phone', label: 'Phone', default: true },
      { key: 'website', label: 'Website', default: true },
      { key: 'googleMapsUri', label: 'Google Maps URL', default: false },
    ],
  },
  {
    label: 'Outreach',
    columns: [
      { key: 'bestContactFirstName', label: 'Best Contact First Name', default: false },
      { key: 'bestContactLastName', label: 'Best Contact Last Name', default: false },
      { key: 'bestContactEmail', label: 'Best Contact Email', default: false },
      { key: 'bestContactPhone', label: 'Best Contact Phone', default: false },
      { key: 'bestContactLinkedin', label: 'Best Contact LinkedIn', default: false },
      { key: 'bestContactInstagram', label: 'Best Contact Instagram', default: false },
      { key: 'bestContactFacebook', label: 'Best Contact Facebook', default: false },
      { key: 'bestContactTwitter', label: 'Best Contact Twitter', default: false },
    ],
  },
  {
    label: 'Google Places',
    columns: [
      { key: 'rating', label: 'Rating', default: true },
      { key: 'reviewCount', label: 'Review Count', default: false },
      { key: 'priceLevel', label: 'Price Level', default: false },
      { key: 'businessType', label: 'Business Type', default: true },
      { key: 'businessStatus', label: 'Business Status', default: false },
      { key: 'latitude', label: 'Latitude', default: false },
      { key: 'longitude', label: 'Longitude', default: false },
      { key: 'editorialSummary', label: 'Editorial Summary', default: false },
      { key: 'reviewSummary', label: 'Review Summary', default: false },
      { key: 'source', label: 'Source', default: false },
    ],
  },
  {
    label: 'AI Scoring',
    columns: [
      { key: 'compositeScore', label: 'Priority Score', default: false },
      { key: 'businessQualityScore', label: 'Business Quality Score', default: false },
      { key: 'exitReadinessScore', label: 'Exit Readiness Score', default: false },
      { key: 'tier', label: 'Tier', default: false },
      { key: 'isIntermediated', label: 'Is Intermediated', default: false },
      { key: 'intermediationSignals', label: 'Intermediation Signals', default: false },
      { key: 'ownershipType', label: 'Ownership Type', default: false },
      { key: 'isExcluded', label: 'Is Excluded', default: false },
      { key: 'exclusionReason', label: 'Exclusion Reason', default: false },
      { key: 'scoringRationale', label: 'Scoring Rationale', default: false },
      { key: 'scoredAt', label: 'Scored At', default: false },
    ],
  },
  {
    label: 'Scraping',
    columns: [
      { key: 'webScrapedAt', label: 'Web Scraped At', default: false },
      { key: 'contactPageUrl', label: 'Contact Page URL', default: false },
      { key: 'pipelineStatus', label: 'Pipeline Status', default: false },
    ],
  },
  {
    label: 'Relations',
    columns: [
      { key: 'campaignName', label: 'Campaign', default: false },
      { key: 'franchiseName', label: 'Franchise', default: false },
    ],
  },
  {
    label: 'Metadata',
    columns: [
      { key: 'createdAt', label: 'Date Added', default: false },
      { key: 'updatedAt', label: 'Last Updated', default: false },
    ],
  },
];

const allColumns = columnGroups.flatMap((g) => g.columns);

export default function Export() {
  const [step, setStep] = useState<Step>('filters');
  const [filters, setFilters] = useState<LeadFiltersType>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    allColumns.filter((c) => c.default).map((c) => c.key)
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<'csv' | 'xlsx' | null>(null);

  const { data: leadCount } = useLeadCount(filters);
  const exportMutation = useExportLeads();
  const { toast } = useToast();

  const steps: { key: Step; label: string }[] = [
    { key: 'filters', label: 'Select Filters' },
    { key: 'columns', label: 'Select Columns' },
    { key: 'preview', label: 'Preview' },
    { key: 'download', label: 'Download' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].key);
    }
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleGroup = (group: ColumnGroup) => {
    const groupKeys = group.columns.map((c) => c.key);
    const allSelected = groupKeys.every((k) => selectedColumns.includes(k));
    if (allSelected) {
      setSelectedColumns((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setSelectedColumns((prev) => [...new Set([...prev, ...groupKeys])]);
    }
  };

  const handleDownload = (format: 'csv' | 'xlsx') => {
    setExportError(null);
    setDownloadingFormat(format);
    exportMutation.mutate(
      { filters, columns: selectedColumns, format },
      {
        onSuccess: (data) => {
          setDownloadingFormat(null);
          const a = document.createElement('a');
          a.href = data.downloadUrl;
          a.download = data.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast({
            title: 'Export complete',
            description: `Downloaded ${formatNumber(data.leadCount)} leads`,
          });
        },
        onError: (error) => {
          setDownloadingFormat(null);
          const msg = error instanceof Error ? error.message : 'Export failed';
          setExportError(msg);
          toast({ title: 'Export failed', description: msg, variant: 'destructive' });
        },
      }
    );
  };

  return (
    <PageContainer title="Export Leads" description="Export leads to CSV or Excel">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.key} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                    index < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStepIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm',
                    index === currentStepIndex ? 'font-medium' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="mx-4 h-px flex-1 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {step === 'filters' && 'Filter Leads'}
            {step === 'columns' && 'Select Columns'}
            {step === 'preview' && 'Preview Export'}
            {step === 'download' && 'Download Ready'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'filters' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Apply filters to select which leads to export. Leave empty to export all leads.
              </p>
              <LeadFilters filters={filters} onChange={setFilters} />
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <span className="text-sm">
                  <span className="font-mono font-semibold text-primary">
                    {formatNumber(leadCount || 0)}
                  </span>{' '}
                  leads match your filters
                </span>
              </div>
            </div>
          )}

          {step === 'columns' && (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Select which columns to include in your export.
              </p>
              {columnGroups.map((group) => {
                const groupKeys = group.columns.map((c) => c.key);
                const selectedInGroup = groupKeys.filter((k) => selectedColumns.includes(k)).length;
                return (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 mb-3">
                      <Checkbox
                        id={`group-${group.label}`}
                        checked={selectedInGroup === groupKeys.length}
                        onCheckedChange={() => toggleGroup(group)}
                      />
                      <Label
                        htmlFor={`group-${group.label}`}
                        className="cursor-pointer font-medium text-sm"
                      >
                        {group.label}
                        <span className="text-muted-foreground font-normal ml-2">
                          ({selectedInGroup}/{groupKeys.length})
                        </span>
                      </Label>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ml-6">
                      {group.columns.map((column) => (
                        <div key={column.key} className="flex items-center gap-2">
                          <Checkbox
                            id={column.key}
                            checked={selectedColumns.includes(column.key)}
                            onCheckedChange={() => toggleColumn(column.key)}
                          />
                          <Label htmlFor={column.key} className="cursor-pointer text-sm">
                            {column.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns(allColumns.map((c) => c.key))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns([])}
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Review your export settings before downloading.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Leads to Export</h4>
                  <p className="text-2xl font-mono font-bold text-primary">
                    {formatNumber(leadCount || 0)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Columns Selected</h4>
                  <p className="text-2xl font-mono font-bold text-primary">
                    {selectedColumns.length}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Selected Columns</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedColumns.map((key) => {
                    const column = allColumns.find((c) => c.key === key);
                    return (
                      <Badge key={key} variant="secondary">
                        {column?.label || key}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 'download' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Ready to Download</h3>
              <p className="text-muted-foreground mb-6">
                Choose a format to generate and download your export.
              </p>
              {exportError && (
                <p className="text-destructive text-sm mb-4">{exportError}</p>
              )}
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={() => handleDownload('csv')}
                  disabled={exportMutation.isPending || selectedColumns.length === 0}
                >
                  {downloadingFormat === 'csv' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {downloadingFormat === 'csv'
                    ? 'Generating...'
                    : `Download CSV`}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleDownload('xlsx')}
                  disabled={exportMutation.isPending || selectedColumns.length === 0}
                >
                  {downloadingFormat === 'xlsx' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  {downloadingFormat === 'xlsx'
                    ? 'Generating...'
                    : `Download Excel`}
                </Button>
              </div>
              <p className="text-muted-foreground text-sm mt-3">
                {formatNumber(leadCount || 0)} leads
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {step !== 'download' && (
          <Button
            onClick={handleNext}
            disabled={step === 'columns' && selectedColumns.length === 0}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
