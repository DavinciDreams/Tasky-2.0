import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// Response component for displaying AI responses with markdown
interface ResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string;
  className?: string;
}

export const Response: React.FC<ResponseProps> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none prose-invert-0',
        'prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed',
        'prose-strong:text-foreground prose-em:text-foreground',
        'prose-ul:text-foreground prose-ol:text-foreground prose-ul:my-2 prose-ol:my-2',
        'prose-li:text-foreground prose-li:my-1 prose-li:marker:text-muted-foreground',
        'prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
        'prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border',
        'prose-blockquote:text-muted-foreground prose-blockquote:border-border prose-blockquote:border-l-4',
        'prose-a:text-primary hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline',
        'prose-hr:border-border',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        '[&>ul]:pl-4 [&>ol]:pl-4 [&_ul]:list-disc [&_ol]:list-decimal',
        className
      )}
      {...props}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
};
