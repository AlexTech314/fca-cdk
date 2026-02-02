import React from 'react';

/**
 * Parse inline markdown formatting (bold, italic, links, emails, phone numbers)
 */
export function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold (**text**)
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Check for italic (*text* or _text_)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_/);
    // Check for links [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // Check for email addresses
    const emailMatch = remaining.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    // Check for phone numbers (various formats)
    const phoneMatch = remaining.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);

    // Find the earliest match
    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
      linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
      emailMatch ? { type: 'email', match: emailMatch, index: emailMatch.index! } : null,
      phoneMatch ? { type: 'phone', match: phoneMatch, index: phoneMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      // No more matches, add remaining text
      parts.push(remaining);
      break;
    }

    const earliest = matches[0]!;
    
    // Add text before the match
    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }

    // Add the formatted element
    if (earliest.type === 'bold') {
      parts.push(<strong key={key++} className="font-semibold text-text">{earliest.match[1]}</strong>);
      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    } else if (earliest.type === 'italic') {
      const content = earliest.match[1] || earliest.match[2];
      parts.push(<em key={key++}>{content}</em>);
      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    } else if (earliest.type === 'link') {
      parts.push(
        <a key={key++} href={earliest.match[2]} className="text-secondary hover:text-primary underline" target="_blank" rel="noopener noreferrer">
          {earliest.match[1]}
        </a>
      );
      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    } else if (earliest.type === 'email') {
      const email = earliest.match[1];
      parts.push(
        <a key={key++} href={`mailto:${email}`} className="text-secondary hover:text-primary underline">
          {email}
        </a>
      );
      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    } else if (earliest.type === 'phone') {
      const phone = earliest.match[1];
      const phoneDigits = phone.replace(/\D/g, '');
      parts.push(
        <a key={key++} href={`tel:+1${phoneDigits}`} className="text-secondary hover:text-primary underline">
          {phone}
        </a>
      );
      remaining = remaining.slice(earliest.index + earliest.match[0].length);
    }
  }

  return parts;
}

/**
 * Render a single markdown block (paragraph, heading, list, hr, etc.)
 */
export function renderMarkdownBlock(block: string, index: number): React.ReactNode {
  // Check if it's a horizontal rule
  if (block.trim() === '---' || block.trim() === '***' || block.trim() === '___') {
    return <hr key={index} className="my-8 border-t border-border" />;
  }
  
  // Check if it's a heading
  if (block.startsWith('## ')) {
    return (
      <h2 key={index} className="mt-8 mb-4 text-xl font-bold text-text">
        {parseInlineMarkdown(block.replace('## ', ''))}
      </h2>
    );
  }
  if (block.startsWith('### ')) {
    return (
      <h3 key={index} className="mt-6 mb-3 text-lg font-semibold text-text">
        {parseInlineMarkdown(block.replace('### ', ''))}
      </h3>
    );
  }
  
  // Check if it's a numbered list (1. 2. 3. etc)
  if (/^\d+\.\s/.test(block)) {
    const items = block.split('\n').filter((line) => /^\d+\.\s/.test(line));
    return (
      <ol key={index} className="mb-4 list-decimal space-y-2 pl-6 text-text-muted">
        {items.map((item, i) => (
          <li key={i}>{parseInlineMarkdown(item.replace(/^\d+\.\s/, ''))}</li>
        ))}
      </ol>
    );
  }
  
  // Check if it's a bullet list
  if (block.startsWith('- ')) {
    const items = block.split('\n').filter((line) => line.startsWith('- '));
    return (
      <ul key={index} className="mb-4 list-disc space-y-2 pl-6 text-text-muted">
        {items.map((item, i) => (
          <li key={i}>{parseInlineMarkdown(item.replace('- ', ''))}</li>
        ))}
      </ul>
    );
  }
  
  // Regular paragraph
  return (
    <p key={index} className="mb-4 text-text-muted leading-relaxed">
      {parseInlineMarkdown(block)}
    </p>
  );
}

