import * as React from "react"
import { ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string;
  label: string;
}

interface MultiComboboxProps {
  options: ComboboxOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  onOpenChange?: (open: boolean) => void;
  /** Server-side search callback. When provided, typing triggers this instead of client-side filtering. */
  onSearch?: (query: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  className?: string;
}

export function MultiCombobox({
  options,
  selected,
  onChange,
  onOpenChange,
  onSearch,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  loading = false,
  className,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const toggle = (value: string) => {
    const updated = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(updated);
  };

  const removeTag = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== value));
  };

  const selectedLabels = selected.map(v => {
    const opt = options.find(o => o.value === v);
    return { value: v, label: opt?.label ?? v };
  });

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-auto min-h-[2.5rem]",
            !selected.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1 text-left">
            {selectedLabels.length > 0 ? (
              selectedLabels.map(({ value, label }) => (
                <Badge key={value} variant="secondary" className="text-xs font-normal px-1.5 py-0">
                  {label}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted-foreground/20 inline-flex items-center"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => removeTag(value, e)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(selected.filter(v => v !== value)); } }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-sm">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command shouldFilter={!onSearch}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearch} />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  selected={selected.includes(option.value)}
                  onSelect={() => toggle(option.value)}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
