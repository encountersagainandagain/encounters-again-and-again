import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MapPin, ArrowRight } from 'lucide-react';
import { currentLocation } from '@/data';

export function CurrentLocation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-cream">
      <div className="section-padding">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image */}
          <div
            className={`relative transition-all duration-1000 ${
              isVisible
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-20'
            }`}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src={currentLocation.image}
                alt={`${currentLocation.city}, ${currentLocation.country}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              
              {/* Map Pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="w-12 h-12 bg-terracotta rounded-full flex items-center justify-center animate-pulse-glow">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 w-12 h-12 bg-terracotta/30 rounded-full animate-ping" />
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className={`transition-all duration-1000 delay-300 ${
              isVisible
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-20'
            }`}
          >
            {/* Label */}
            <span className="font-body text-sm font-medium tracking-[2px] uppercase text-black/50 mb-4 block">
              current location
            </span>

            {/* Location Name */}
            <h2 className="font-display text-3xl md:text-4xl font-light mb-8">
              {currentLocation.city}, {currentLocation.country}
            </h2>

            {/* Next Stops */}
            <div>
              <span className="font-display text-xl italic text-terracotta mb-4 block">
                next stops
              </span>
              
              <ul className="space-y-3">
                {currentLocation.nextStops.map((stop, index) => (
                  <li
                    key={stop}
                    className={`flex items-center gap-3 group cursor-default transition-all duration-500 ${
                      isVisible
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-8'
                    }`}
                    style={{
                      transitionDelay: `${index * 100 + 500}ms`,
                    }}
                  >
                    <ArrowRight className="w-4 h-4 text-terracotta transition-transform group-hover:translate-x-2" />
                    <span className="font-body text-base text-black/70 group-hover:text-terracotta transition-colors">
                      {stop}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
