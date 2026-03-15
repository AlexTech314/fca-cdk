import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Lead } from '@/types';

export function ContactsCell({ lead }: { lead: Lead }) {
  const contacts = lead.leadContacts ?? [];
  if (contacts.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="cursor-default">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          <ul className="space-y-1.5 text-xs">
            {contacts.map((c) => {
              const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
              return (
                <li key={c.id} className="space-y-0.5">
                  {name && <div className="font-medium">{name}</div>}
                  {c.email && <div>{c.email}</div>}
                  {c.phone && <div>{c.phone}</div>}
                  {c.linkedin && <div className="truncate">LinkedIn: {c.linkedin}</div>}
                  {c.isBestContact && (
                    <span className="text-[10px] px-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      best contact
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
