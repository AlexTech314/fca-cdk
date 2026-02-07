import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<string>('30');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetChange = (days: string) => {
    setPreset(days);
    if (days === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      const numDays = parseInt(days);
      onChange({
        start: subDays(new Date(), numDays).toISOString(),
        end: new Date().toISOString(),
      });
    }
  };

  const handleCustomChange = (field: 'start' | 'end', date: string) => {
    onChange({
      ...value,
      [field]: new Date(date).toISOString(),
    });
  };

  return (
    <div className="flex items-center gap-4">
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.days} value={p.days.toString()}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {isCustom && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              {format(new Date(value.start), 'MMM d')} -{' '}
              {format(new Date(value.end), 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={format(new Date(value.start), 'yyyy-MM-dd')}
                  onChange={(e) => handleCustomChange('start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={format(new Date(value.end), 'yyyy-MM-dd')}
                  onChange={(e) => handleCustomChange('end', e.target.value)}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <span className="text-sm text-muted-foreground">
        {format(new Date(value.start), 'MMM d')} -{' '}
        {format(new Date(value.end), 'MMM d, yyyy')}
      </span>
    </div>
  );
}
