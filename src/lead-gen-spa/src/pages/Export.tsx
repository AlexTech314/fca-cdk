import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { useLeadCount } from '@/hooks/useLeads';
import type { LeadFilters as LeadFiltersType } from '@/types';
import { Download, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

type Step = 'filters' | 'columns' | 'preview' | 'download';

const availableColumns = [
  { key: 'name', label: 'Business Name', default: true },
  { key: 'address', label: 'Address', default: true },
  { key: 'city', label: 'City', default: true },
  { key: 'state', label: 'State', default: true },
  { key: 'zipCode', label: 'Zip Code', default: true },
  { key: 'phone', label: 'Phone', default: true },
  { key: 'website', label: 'Website', default: true },
  { key: 'rating', label: 'Rating', default: true },
  { key: 'reviewCount', label: 'Review Count', default: false },
  { key: 'businessType', label: 'Business Type', default: true },
  { key: 'scoringRationale', label: 'Scoring Rationale', default: false },
  { key: 'createdAt', label: 'Date Added', default: true },
];

export default function Export() {
  const [step, setStep] = useState<Step>('filters');
  const [filters, setFilters] = useState<LeadFiltersType>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    availableColumns.filter(c => c.default).map(c => c.key)
  );

  const { data: leadCount } = useLeadCount(filters);

  const steps: { key: Step; label: string }[] = [
    { key: 'filters', label: 'Select Filters' },
    { key: 'columns', label: 'Select Columns' },
    { key: 'preview', label: 'Preview' },
    { key: 'download', label: 'Download' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

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
    setSelectedColumns(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleDownload = () => {
    // Placeholder for download functionality
    console.log('Downloading with filters:', filters);
    console.log('Selected columns:', selectedColumns);
    alert('Export functionality will be implemented when the backend is ready.');
  };

  return (
    <PageContainer 
      title="Export Leads"
      description="Export leads to CSV file"
    >
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
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Select which columns to include in your export.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableColumns.map((column) => (
                  <div key={column.key} className="flex items-center gap-2">
                    <Checkbox
                      id={column.key}
                      checked={selectedColumns.includes(column.key)}
                      onCheckedChange={() => toggleColumn(column.key)}
                    />
                    <Label htmlFor={column.key} className="cursor-pointer">
                      {column.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedColumns(availableColumns.map(c => c.key))}
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
                  {selectedColumns.map(key => {
                    const column = availableColumns.find(c => c.key === key);
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
                Your export file is ready. Click the button below to download.
              </p>
              <Button size="lg" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV ({formatNumber(leadCount || 0)} leads)
              </Button>
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
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
