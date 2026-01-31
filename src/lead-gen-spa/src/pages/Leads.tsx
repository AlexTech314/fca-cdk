import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { LeadTable } from '@/components/leads/LeadTable';
import { LeadFilters } from '@/components/leads/LeadFilters';
import { Button } from '@/components/ui/button';
import { useLeads, defaultLeadQueryParams } from '@/hooks/useLeads';
import type { LeadFilters as LeadFiltersType, LeadQueryParams } from '@/types';
import { Filter, X } from 'lucide-react';

export default function Leads() {
  const [showFilters, setShowFilters] = useState(false);
  const [queryParams, setQueryParams] = useState<LeadQueryParams>(defaultLeadQueryParams);

  const { data, isLoading } = useLeads(queryParams);

  const handleFiltersChange = (filters: LeadFiltersType) => {
    setQueryParams(prev => ({ ...prev, filters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  };

  const handleSortChange = (sort: string, order: 'asc' | 'desc') => {
    setQueryParams(prev => ({ ...prev, sort, order }));
  };

  const handleClearFilters = () => {
    setQueryParams(prev => ({ ...prev, filters: {}, page: 1 }));
  };

  const hasActiveFilters = Object.keys(queryParams.filters).length > 0;

  return (
    <PageContainer 
      title="Leads"
      description={data ? `${data.total.toLocaleString()} leads found` : 'Loading leads...'}
      actions={
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear Filters
            </Button>
          )}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {Object.keys(queryParams.filters).length}
              </span>
            )}
          </Button>
        </div>
      }
    >
      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6">
          <LeadFilters 
            filters={queryParams.filters} 
            onChange={handleFiltersChange} 
          />
        </div>
      )}

      {/* Table */}
      <LeadTable
        data={data?.data || []}
        isLoading={isLoading}
        pagination={{
          page: queryParams.page,
          limit: queryParams.limit,
          total: data?.total || 0,
          totalPages: data?.totalPages || 0,
        }}
        sorting={{
          sort: queryParams.sort,
          order: queryParams.order,
        }}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
      />
    </PageContainer>
  );
}
