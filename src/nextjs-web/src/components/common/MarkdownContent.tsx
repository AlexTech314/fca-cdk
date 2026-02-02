import React from 'react';
import { renderMarkdownBlock } from '@/lib/markdown';

/**
 * Props for the MarkdownContent component
 */
interface MarkdownContentProps {
  /** Array of content blocks (paragraphs, headings, etc.) */
  blocks: string[];
  /** Optional additional className for the container */
  className?: string;
}

/**
 * Component to render markdown content blocks
 */
export function MarkdownContent({ blocks, className = '' }: MarkdownContentProps) {
  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      {blocks.map((block, index) => renderMarkdownBlock(block, index))}
    </div>
  );
}
