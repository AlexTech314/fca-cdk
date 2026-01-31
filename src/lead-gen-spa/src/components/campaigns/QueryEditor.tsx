interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  queryCount: number;
}

export function QueryEditor({ value, onChange, queryCount }: QueryEditorProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter search queries, one per line...

Example:
plumbers in Denver CO
plumbers in Boulder CO
HVAC contractors Denver
electricians Colorado Springs"
          className="min-h-[200px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
        />
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Enter one Google search query per line
        </span>
        <span className={queryCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}>
          {queryCount} {queryCount === 1 ? 'query' : 'queries'}
        </span>
      </div>
    </div>
  );
}
