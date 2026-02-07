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
  const baseUrl = import.meta.env.VITE_WEBSITE_URL || 'http://localhost:3000';

  const previewPath = {
    'tombstone': `/preview/transactions/${slug}`,
    'blog-post': `/preview/news/${slug}`,
    'page': `/preview/${slug}`,
  }[contentType];

  const previewUrl = `${baseUrl}${previewPath}?token=${previewToken}`;

  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <div className="bg-muted px-3 py-2 flex items-center justify-between border-b">
        <span className="text-sm text-muted-foreground">Live Preview</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenInNewTab}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          Open in new tab
        </Button>
      </div>
      <iframe
        src={previewUrl}
        className="w-full h-[500px] bg-white"
        title="Content Preview"
      />
    </div>
  );
}
