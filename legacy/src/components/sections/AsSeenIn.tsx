import { useEffect, useRef, useState } from 'react';

const partners = [
  { name: 'National Geographic', logo: 'NAT GEO' },
  { name: 'Lonely Planet', logo: 'LONELY PLANET' },
  { name: 'Condé Nast', logo: 'CONDÉ NAST' },
  { name: 'Travel + Leisure', logo: 'TRAVEL + LEISURE' },
  { name: 'BBC Travel', logo: 'BBC TRAVEL' },
];

export function AsSeenIn() {
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
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 bg-cream border-y border-black/5">
      <div className="section-padding">
        {/* Heading */}
        <h3
          className={`font-display text-2xl md:text-3xl font-light text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          As seen in:
        </h3>

        {/* Logos */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {partners.map((partner, index) => (
            <div
              key={partner.name}
              className={`transition-all duration-500 hover:scale-110 cursor-default ${
                isVisible
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-90'
              }`}
              style={{
                transitionDelay: `${index * 100 + 200}ms`,
              }}
            >
              <span className="font-display text-lg md:text-xl font-medium text-black/30 hover:text-black/60 transition-colors tracking-wider">
                {partner.logo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
