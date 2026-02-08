'use client';

import { EditableField } from '../EditableField';
import { useAdminPage } from '../AdminPageContext';

/**
 * CTA section for the About admin page.
 * Uses about-specific metadata keys: ctaTitle, ctaDescription, ctaText.
 */
export function EditableAboutCTA() {
  const { data, updateField, dirtyFields } = useAdminPage();
  const meta = data.metadata;

  return (
    <section
      className="py-16 md:py-20"
      style={{
        background:
          'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)',
      }}
    >
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <EditableField
            fieldKey="ctaTitle"
            value={meta.ctaTitle || ''}
            onChange={updateField}
            as="h2"
            className="text-3xl font-bold md:text-4xl"
            style={{ color: '#ffffff' }}
            isDirty={dirtyFields.has('ctaTitle')}
            placeholder="CTA title..."
          />

          <EditableField
            fieldKey="ctaDescription"
            value={meta.ctaDescription || ''}
            onChange={updateField}
            as="p"
            className="mt-4 text-lg"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            isDirty={dirtyFields.has('ctaDescription')}
            placeholder="CTA description..."
          />

          <div className="mt-8">
            <span
              className="inline-flex items-center justify-center rounded-md border-2 px-6 py-3 text-base font-semibold"
              style={{
                borderColor: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
              }}
            >
              <EditableField
                fieldKey="ctaText"
                value={meta.ctaText || ''}
                onChange={updateField}
                as="span"
                isDirty={dirtyFields.has('ctaText')}
                placeholder="CTA button text..."
              />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
