import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { SiteSettings } from "@/lib/siteSettings";

export function NextStops({ settings }: { settings: SiteSettings }) {
  const nextStops = settings.homeNextStops
    .split('\n')
    .map((stop) => stop.trim())
    .filter(Boolean);

  return (
    <section className="py-24 lg:pt-10 lg:pb-20 bg-gray-50">
      <div className="section-padding">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="relative">
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-[#ad6d4d] pb-10">
              {settings.homeNextEyebrow}
            </h2>
            <div className="group relative aspect-[4/3] rounded-3xl overflow-hidden shadow-xl">
              <Image
                src={settings.homeNextImage}
                alt="Next destinations"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
            </div>
          </div>

          <div>
            <h2 className="font-display text-4xl lg:text-5xl text-black leading-tight">
              {settings.homeNextTitle}
            </h2>

            <p className="mt-4 text-black/60 text-lg max-w-md">
              {settings.homeNextSubtitle}
            </p>

            <ul className="mt-8 space-y-4">
              {nextStops.map((stop, index) => (
                <li
                  key={index}
                  className="group flex items-center justify-between border-b border-black/10 pb-3"
                >
                  <span className="font-body text-lg text-black/80 group-hover:text-terracotta transition-colors">
                    {stop}
                  </span>

                  <ArrowRight className="w-5 h-5 text-terracotta transition-transform duration-300 group-hover:translate-x-2" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
