import Image from 'next/image';
import Link from 'next/link';

const favoriteDesigns = [
  {
    name: 'The Art of Being Present',
    href: '/shop/the-art-of-being-present',
    image:
      'https://rskujzyhdktsmnngqfld.supabase.co/storage/v1/object/public/media/optimized/products/examples/afb5029a-f6c4-4fd0-a586-0e109c0f6ce0-img-0839.jpg',
  },
  {
    name: 'Yin Yang Manta Hoodie',
    href: '/shop/yin-yang-manta-hoodie',
    image:
      'https://rskujzyhdktsmnngqfld.supabase.co/storage/v1/object/public/media/optimized/products/examples/0af892c6-003a-4ead-a54d-a07777d1c721-img-0976.jpg',
  },
];

export function DesignsSection() {
  return (
    <section className="relative overflow-hidden bg-[#86e6ea]">
      <Image
        src="/images/home/my-designs-bg.webp"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="object-cover pointer-events-none select-none"
      />

      <div className="relative section-padding py-16 md:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 items-center max-w-7xl mx-auto">
          <div className="flex flex-col items-start">
            <h2 className="bg-white px-5 py-2 md:px-6 font-display text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-black">
              My Designs
            </h2>

            <div className="mt-8 md:mt-10 w-full bg-white px-6 py-8 md:px-10 md:py-10 text-center">
              <p className="font-display text-2xl md:text-3xl font-bold text-black">
                Wear a piece of the ocean.
              </p>
              <p className="mt-5 font-display text-lg md:text-xl font-light leading-relaxed text-black/80 text-balance">
                Hand-drawn designs inspired by the places, creatures, and dives that shape my world.
              </p>
              <div className="mt-8 flex justify-center md:justify-end">
                <Link
                  href="/shop"
                  className="group inline-flex items-center gap-2 font-display text-sm md:text-base text-black border-b border-black pb-0.5 hover:text-ocean hover:border-ocean transition-colors"
                >
                  <span>Shop my designs</span>
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <h3 className="bg-white px-8 py-2 md:px-14 font-display text-3xl md:text-4xl lg:text-5xl font-light text-black">
              My Favorites
            </h3>

            <div className="mt-8 md:mt-10 grid w-full grid-cols-2 gap-4 md:gap-6">
              {favoriteDesigns.map((design) => (
                <Link
                  key={design.href}
                  href={design.href}
                  className="group relative block bg-white p-2 md:p-3"
                >
                  <div className="relative aspect-square overflow-hidden bg-white">
                    <Image
                      src={design.image}
                      alt={design.name}
                      fill
                      sizes="(min-width: 1024px) 28vw, 45vw"
                      className="object-contain"
                    />
                  </div>
                  <span className="pointer-events-none absolute inset-x-2 bottom-2 md:inset-x-3 md:bottom-3 bg-white/90 py-2 text-center font-display text-xs md:text-sm tracking-wide text-black opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    {design.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
