import { Container } from '@/components/ui/Container';

interface PreviewShellProps {
  typeLabel: string;
  itemTitle: string;
}

export function PreviewShell({ typeLabel, itemTitle }: PreviewShellProps) {
  return (
    <>
      <div className="bg-amber-100 border-b border-amber-300">
        <Container>
          <div className="py-2 text-center text-sm text-amber-800">
            <strong>Preview Mode</strong> — This content is not published yet
          </div>
        </Container>
      </div>

      <div className="border-b border-border bg-surface">
        <Container>
          <nav className="py-4">
            <ol className="flex items-center gap-2 text-sm text-text-muted">
              <li>Preview</li>
              <li>/</li>
              <li>{typeLabel}</li>
              <li>/</li>
              <li className="max-w-[200px] truncate font-medium text-text">
                {itemTitle}
              </li>
            </ol>
          </nav>
        </Container>
      </div>
    </>
  );
}
