import { Link } from 'react-router-dom';
import { FileEdit, ExternalLink } from 'lucide-react';

import { usePages } from '@/hooks/usePages';
import { formatDate } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function PageContentPage() {
  const { data: pages, isLoading } = usePages();

  return (
    <PageContainer
      title="Page Content"
      description="Edit static page content on the website"
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : pages && pages.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Card key={page.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize">{page.pageKey}</CardTitle>
                  <FileEdit className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription>{page.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">
                  Last updated: {formatDate(page.updatedAt)}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/content/page/${page.pageKey}`}>
                      Edit
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`https://www.flatironscapital.com/${page.pageKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No pages found.</p>
        </div>
      )}
    </PageContainer>
  );
}
