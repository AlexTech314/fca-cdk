import { useEffect, useState, useRef, useMemo } from 'react';
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { Skeleton } from '@/components/ui/skeleton';

interface BlockNoteEditorProps {
  initialMarkdown?: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function BlockNoteEditor({
  initialMarkdown = '',
  onChange,
}: BlockNoteEditorProps) {
  const [isReady, setIsReady] = useState(false);
  const initialLoadRef = useRef(false);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref updated
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create the editor
  const editor = useCreateBlockNote();

  // Load initial markdown content (only once)
  useEffect(() => {
    if (!editor || initialLoadRef.current) return;

    const loadContent = async () => {
      if (initialMarkdown) {
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(initialMarkdown);
          editor.replaceBlocks(editor.document, blocks);
        } catch (error) {
          console.error('Failed to parse markdown:', error);
        }
      }
      initialLoadRef.current = true;
      setIsReady(true);
    };

    loadContent();
  }, [editor, initialMarkdown]);

  // Handle content changes - convert to markdown and call onChange
  const handleChange = useMemo(() => {
    return async () => {
      if (!editor || !initialLoadRef.current) return;

      try {
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        onChangeRef.current(markdown);
      } catch (error) {
        console.error('Failed to convert to markdown:', error);
      }
    };
  }, [editor]);

  if (!isReady) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="blocknote-wrapper h-full">
      <BlockNoteView 
        editor={editor} 
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
}
