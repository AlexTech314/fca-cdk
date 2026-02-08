'use client';

import Image from 'next/image';
import { useState } from 'react';
import { EditableField } from '../EditableField';
import { useAdminPage } from '../AdminPageContext';
import { AssetPickerModal } from '../AssetPickerModal';

interface EditableHeroProps {
  tagline?: string;
}

export function EditableHero({ tagline }: EditableHeroProps) {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;
  const [pickerOpen, setPickerOpen] = useState(false);

  const heroImage = meta.heroImage || '';

  const handleImageSelect = (s3Url: string) => {
    updateField('heroImage', s3Url);
    setPickerOpen(false);
  };

  return (
    <section className="relative min-h-[600px] overflow-hidden md:min-h-[700px]">
      {/* Background Image */}
      <div className="absolute inset-0">
        {heroImage && (
          <>
            <Image
              src={heroImage}
              alt="Hero background"
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div className="hero-gradient absolute inset-0" />
          </>
        )}

        {/* Change Image button — top-right, does not cover other content */}
        <button
          onClick={() => setPickerOpen(true)}
          className={`absolute right-4 top-4 z-20 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium shadow-lg backdrop-blur-sm transition-colors ${
            dirtyFields.has('heroImage')
              ? 'bg-amber-500/90 text-white'
              : 'bg-white/90 text-gray-800 hover:bg-white'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
          </svg>
          {dirtyFields.has('heroImage') ? 'Image changed (unsaved)' : 'Change Image'}
        </button>
      </div>

      {/* Asset Picker Modal */}
      <AssetPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleImageSelect}
        currentValue={heroImage}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-[600px] items-center md:min-h-[700px]">
        <div className="container-max py-20">
          <div className="max-w-3xl">
            <EditableField
              fieldKey="subtitle"
              value={meta.subtitle || ''}
              onChange={updateField}
              as="p"
              className="mb-4 text-sm font-semibold uppercase tracking-wider"
              style={{ color: '#7dd3fc' }}
              isDirty={dirtyFields.has('subtitle')}
              placeholder="Subtitle text..."
            />

            <EditableField
              fieldKey="title"
              value={data.title}
              onChange={updateField}
              as="h1"
              className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl"
              style={{
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
              isDirty={dirtyFields.has('title')}
              placeholder="Hero title..."
            />

            <EditableField
              fieldKey="description"
              value={meta.description || ''}
              onChange={updateField}
              as="p"
              className="mt-6 text-lg md:text-xl"
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
              isDirty={dirtyFields.has('description')}
              placeholder="Hero description..."
            />

            <div className="mt-8 flex flex-wrap gap-4">
              <span
                className="inline-flex items-center justify-center rounded-md px-6 py-3 text-base font-semibold shadow-lg"
                style={{ backgroundColor: '#ffffff', color: '#1e3a5f' }}
              >
                <EditableField
                  fieldKey="ctaText"
                  value={meta.ctaText || 'Get Started'}
                  onChange={updateField}
                  as="span"
                  isDirty={dirtyFields.has('ctaText')}
                  placeholder="CTA text..."
                />
              </span>

              <span
                className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold backdrop-blur-sm"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                }}
              >
                <EditableField
                  fieldKey="secondaryCtaText"
                  value={meta.secondaryCtaText || ''}
                  onChange={updateField}
                  as="span"
                  isDirty={dirtyFields.has('secondaryCtaText')}
                  placeholder="Secondary CTA..."
                />
              </span>
            </div>

            <EditableField
              fieldKey="heroTagline"
              value={meta.heroTagline || tagline || ''}
              onChange={updateField}
              as="p"
              className="mt-8 text-sm font-medium"
              style={{ color: 'rgba(255, 255, 255, 0.8)' }}
              isDirty={dirtyFields.has('heroTagline')}
              placeholder="Tagline text..."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
