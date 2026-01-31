import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentSidebarProps {
  children: React.ReactNode;
  title?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  footer?: React.ReactNode;
}

export function ContentSidebar({
  children,
  title = 'Details',
  isOpen: controlledIsOpen,
  onOpenChange,
  footer,
}: ContentSidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  return (
    <>
      {/* Toggle button - always visible on right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed right-0 top-1/2 -translate-y-1/2 z-40',
          'flex items-center justify-center',
          'w-6 h-16 bg-muted border border-r-0 rounded-l-md',
          'hover:bg-muted/80 transition-colors',
          isOpen && 'right-[400px]'
        )}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[400px] z-30',
          'bg-background border-l',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {children}
            </div>
          </ScrollArea>

          {/* Footer */}
          {footer && (
            <div className="border-t px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
