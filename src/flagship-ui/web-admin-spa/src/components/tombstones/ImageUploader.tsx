import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
  value?: string;
  onChange: (path: string) => void;
  className?: string;
}

export function ImageUploader({ value, onChange, className }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleFile(file);
      }
    },
    []
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    []
  );

  const handleFile = (file: File) => {
    // Show a local preview while the image path is set
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      // TODO: When S3 upload is wired, upload here and set the returned URL.
      // For now, set the path based on the file name (matches static tombstone images).
      onChange(`/tombstones/${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      {preview ? (
        <div className="relative">
          <div className="relative aspect-video rounded-lg border bg-muted overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          className={cn(
            'flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center py-8">
            {isDragging ? (
              <Upload className="h-10 w-10 text-primary mb-3" />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
            )}
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium text-foreground">Click to upload</span>{' '}
              or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, or WebP (max 2MB)
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      )}
    </div>
  );
}
