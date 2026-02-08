'use client';

import { EditableField } from '../EditableField';
import { useAdminPage } from '../AdminPageContext';

export function EditableCTASection() {
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
            fieldKey="bottomCtaTitle"
            value={meta.bottomCtaTitle || ''}
            onChange={updateField}
            as="h2"
            className="text-3xl font-bold md:text-4xl"
            style={{ color: '#ffffff' }}
            isDirty={dirtyFields.has('bottomCtaTitle')}
            placeholder="CTA title..."
          />

          <EditableField
            fieldKey="bottomCtaDescription"
            value={meta.bottomCtaDescription || ''}
            onChange={updateField}
            as="p"
            className="mt-4 text-lg"
            style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            isDirty={dirtyFields.has('bottomCtaDescription')}
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
                fieldKey="bottomCtaText"
                value={meta.bottomCtaText || ''}
                onChange={updateField}
                as="span"
                isDirty={dirtyFields.has('bottomCtaText')}
                placeholder="CTA button text..."
              />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
