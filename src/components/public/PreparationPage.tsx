import Link from 'next/link';
export function PreparationPage({title}: {title: string}) {
  return <section className="enc-preparation"><p className="enc-eyebrow">Encounters Again and Again</p><h1>{title}</h1>
    <p>This space is taking shape.</p><Link href="/">Back home</Link>
  </section>;
}
