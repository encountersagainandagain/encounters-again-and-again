import { safeJsonLd, type JsonLdValue } from '@/lib/structuredData';

type JsonLdProps = {
  id: string;
  data: JsonLdValue;
};

export function JsonLd({ id, data }: JsonLdProps) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
