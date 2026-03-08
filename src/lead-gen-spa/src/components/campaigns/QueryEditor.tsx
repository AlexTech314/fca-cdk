import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Search, Trash2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface QueryEditorProps {
  queries: string[];
  onChange: (queries: string[]) => void;
}

const COMPACT_THRESHOLD = 50;
const SAMPLE_COUNT = 8;

export function QueryEditor({ queries, onChange }: QueryEditorProps) {
  const [newQuery, setNewQuery] = useState('');

  const addQuery = () => {
    const q = newQuery.trim();
    if (!q) return;
    onChange([...queries, q]);
    setNewQuery('');
  };

  const removeQuery = (index: number) => {
    onChange(queries.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    onChange([]);
  };

  const addInput = (
    <div className="flex gap-2">
      <Input
        placeholder="Add a search query..."
        value={newQuery}
        onChange={(e) => setNewQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addQuery())}
      />
      <Button type="button" size="icon" variant="outline" onClick={addQuery} disabled={!newQuery.trim()}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  // Empty state
  if (queries.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <Search className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No queries yet</p>
          <p className="text-xs">Add queries manually or use the generator</p>
        </div>
        {addInput}
      </div>
    );
  }

  // Compact view (50+ queries) — always summarized, never render all
  if (queries.length >= COMPACT_THRESHOLD) {
    const samples = queries.slice(0, SAMPLE_COUNT);
    const remaining = queries.length - SAMPLE_COUNT;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{formatNumber(queries.length)} queries</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={clearAll}>
            <Trash2 className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 p-3 border rounded-lg">
          {samples.map((q, i) => (
            <Badge key={i} variant="secondary" className="text-xs font-mono">
              {q}
            </Badge>
          ))}
          {remaining > 0 && (
            <Badge variant="outline" className="text-xs">
              +{formatNumber(remaining)} more
            </Badge>
          )}
        </div>
        {addInput}
      </div>
    );
  }

  // Small list view (< 50 queries) — render all directly
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{formatNumber(queries.length)} queries</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={clearAll}>
          <Trash2 className="h-3 w-3 mr-1" />
          Clear all
        </Button>
      </div>
      <div className="border rounded-lg max-h-64 overflow-auto">
        <div className="p-2 space-y-0.5">
          {queries.map((q, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded text-sm group hover:bg-muted/50"
            >
              <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{i + 1}.</span>
              <span className="font-mono text-xs flex-1 truncate">{q}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => removeQuery(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      {addInput}
    </div>
  );
}
