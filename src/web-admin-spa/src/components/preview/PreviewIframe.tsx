import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PreviewIframeProps {
  contentType: 'tombstone' | 'blog-post' | 'page';
  slug: string;
  previewToken: string;
  className?: string;
}

export function PreviewIframe({
  contentType,
  slug,
  previewToken,
  className,
}: PreviewIframeProps) {
  const baseUrl = import.meta.env.VITE_WEBSITE_URL || 'https://www.flatironscapital.com';

  // Map content types to preview routes
  const previewPath = {
    'tombstone': `/preview/transactions/${slug}`,
    'blog-post': `/preview/news/${slug}`,
    'page': `/preview/${slug}`,
  }[contentType];

  const previewUrl = `${baseUrl}${previewPath}?token=${previewToken}`;

  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank');
  };

  // In mock mode, show a placeholder
  const isMockMode = !import.meta.env.VITE_WEBSITE_URL;

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className="bg-muted px-3 py-2 flex items-center justify-between border-b">
        <span className="text-sm text-muted-foreground">Live Preview</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenInNewTab}
          disabled={isMockMode}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Open in new tab
        </Button>
      </div>
      {isMockMode ? (
        <div className="h-[500px] bg-background flex items-center justify-center">
          <div className="text-center p-6">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Preview Not Available</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Set VITE_WEBSITE_URL environment variable to enable live preview
            </p>
            <div className="mt-4 p-3 rounded-lg bg-muted text-left">
              <p className="text-xs font-mono text-muted-foreground">
                Preview URL would be:
              </p>
              <p className="text-xs font-mono text-foreground break-all mt-1">
                {previewUrl}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={previewUrl}
          className="w-full h-[500px] bg-white"
          title="Content Preview"
        />
      )}
    </div>
  );
}
