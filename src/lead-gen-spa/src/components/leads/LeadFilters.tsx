import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { LeadFilters as LeadFiltersType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface LeadFiltersProps {
  filters: LeadFiltersType;
  onChange: (filters: LeadFiltersType) => void;
}

const businessTypes = ['Plumber', 'HVAC', 'Electrician', 'Roofer', 'Landscaper', 'General Contractor'];

export function LeadFilters({ filters, onChange }: LeadFiltersProps) {
  const { data: states = [] } = useQuery({
    queryKey: ['locations', 'states'],
    queryFn: () => api.getLocationsStates(),
  });

  const updateFilters = (updates: Partial<LeadFiltersType>) => {
    onChange({ ...filters, ...updates });
  };

  const toggleArrayFilter = (
    key: 'stateIds' | 'businessTypes',
    value: string
  ) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilters({ [key]: updated.length > 0 ? updated : undefined });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Name Search */}
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input
              placeholder="Search by name..."
              value={filters.name || ''}
              onChange={(e) => updateFilters({ name: e.target.value || undefined })}
            />
          </div>

          {/* States */}
          <div className="space-y-2 lg:col-span-2">
            <Label>States</Label>
            <div className="flex flex-wrap gap-2">
              {states.map((state) => (
                <Badge
                  key={state.id}
                  variant={filters.stateIds?.includes(state.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('stateIds', state.id)}
                >
                  {state.id}
                </Badge>
              ))}
            </div>
          </div>

          {/* Business Types */}
          <div className="space-y-2 lg:col-span-2">
            <Label>Business Type</Label>
            <div className="flex flex-wrap gap-2">
              {businessTypes.map((type) => (
                <Badge
                  key={type}
                  variant={filters.businessTypes?.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('businessTypes', type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Rating Range */}
          <div className="space-y-2">
            <Label>Rating Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                max={5}
                step={0.1}
                value={filters.ratingMin ?? ''}
                onChange={(e) => updateFilters({ ratingMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-20"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                min={0}
                max={5}
                step={0.1}
                value={filters.ratingMax ?? ''}
                onChange={(e) => updateFilters({ ratingMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-20"
              />
            </div>
          </div>

          {/* Qualification Range */}
          <div className="space-y-2">
            <Label>Qualification Score</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                min={0}
                max={100}
                value={filters.qualificationMin ?? ''}
                onChange={(e) => updateFilters({ qualificationMin: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                min={0}
                max={100}
                value={filters.qualificationMax ?? ''}
                onChange={(e) => updateFilters({ qualificationMax: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-20"
              />
            </div>
          </div>

          {/* Contact Info Checkboxes */}
          <div className="space-y-3">
            <Label>Contact Info</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasWebsite"
                  checked={filters.hasWebsite === true}
                  onCheckedChange={(checked) => 
                    updateFilters({ hasWebsite: checked === true ? true : undefined })
                  }
                />
                <Label htmlFor="hasWebsite" className="font-normal cursor-pointer">
                  Has Website
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasPhone"
                  checked={filters.hasPhone === true}
                  onCheckedChange={(checked) => 
                    updateFilters({ hasPhone: checked === true ? true : undefined })
                  }
                />
                <Label htmlFor="hasPhone" className="font-normal cursor-pointer">
                  Has Phone
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasExtractedEmail"
                  checked={filters.hasExtractedEmail === true}
                  onCheckedChange={(checked) => 
                    updateFilters({ hasExtractedEmail: checked === true ? true : undefined })
                  }
                />
                <Label htmlFor="hasExtractedEmail" className="font-normal cursor-pointer">
                  Has Extracted Email
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hasExtractedPhone"
                  checked={filters.hasExtractedPhone === true}
                  onCheckedChange={(checked) => 
                    updateFilters({ hasExtractedPhone: checked === true ? true : undefined })
                  }
                />
                <Label htmlFor="hasExtractedPhone" className="font-normal cursor-pointer">
                  Has Extracted Phone
                </Label>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
