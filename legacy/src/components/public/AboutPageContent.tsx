import Image from 'next/image';
import Link from 'next/link';
import { getAboutPageImageDefinition } from '@/data/aboutPageImages';
import type { SiteSettings } from '@/lib/siteSettings';

/* ============================================================
   ABOUT ME PAGE - "What Katie Seas"
   Design: Editorial layout with alternating text + photo grids
   Responsive: 2-col grids stack on mobile
   Placeholder images: Use /images/about/about-PLACEHOLDER.jpg format
   ============================================================ */

interface SectionData {
  id: string;
  title: string;
  titleAccent?: string; // italic part
  paragraphs: string[];
  imageIds?: string[];
}

const sections: SectionData[] = [
  {
    id: 'how-it-began',
    title: 'How It All Began:',
    titleAccent: 'My Journey Into the Ocean',
    paragraphs: [
      'Before I even knew how to swim, I was already in the ocean.',
      'I was that kid in floaties, clutching a little raft while my parents snorkeled somewhere in the Caribbean. I don’t remember being scared. I remember curiosity. I remember the light filtering through the water, the fish weaving between the corals, and the feeling that this—this vast, blue world—was meant to be explored.',
      'My parents grew up in Cuba and moved to the United States when they could. Once they settled, they made a promise to themselves: my brother and I would see the world. At least once a year, we traveled. Most of the time, somewhere in the Caribbean, chasing coral reefs and crystal-clear waters.',
      'We visited islands like the Cayman Islands, Turks and Caicos, The Bahamas, Aruba, Bonaire, Curaçao, and St. Thomas—each island offering new colors, new creatures, and new underwater worlds to explore.',
      'Every trip followed the same rhythm: fins on, mask on, diving down again and again. I spent hours swimming, free diving, and chasing every fish I could find. The ocean wasn’t just something we visited—it became where I felt most at home.',
    ],
    imageIds: ['how-it-began-1', 'how-it-began-2'],
  },
  {
    id: 'first-steps',
    title: 'The First Steps Toward a Life Underwater',
    paragraphs: [
      'I got my Open Water certification when I was 13, thanks to a gentle push from my dad. At the time, I didn’t realize that this small step would quietly chart the course of my life.',
    ],
    imageIds: ['first-steps-1', 'first-steps-2'],
  },
  {
    id: 'after-certification',
    title: '',
    paragraphs: [
      '10 years later, I found myself sitting at a desk, working an office job. Air conditioning hum. Fluorescent lights. Endless screen time. And a quiet, restless feeling that something wasn’t right. That it wasn’t the place I was meant to be.',
      'I loved the ocean. I loved exploring. I loved being in the water more than anything else. And suddenly, I realized: I didn’t have to just love it—I could live it.',
    ],
  },
  {
    id: 'leap-unknown',
    title: 'A Leap Into the Unknown',
    paragraphs: [
      'So I made a choice that didn’t make sense to most people: I packed up my life and moved to Spain. Specifically, the volcanic island of Tenerife in the Canary Islands.',
      'I had always wanted to live in a Spanish-speaking country to feel more connected to my roots. My parents were born in Cuba but my grandma’s side of the family is from Tenerife, which made the decision feel even more meaningful.',
      'There, I immersed myself in dive training, working toward my Divemaster certification. Every day I spent in the water felt like reclaiming a part of myself I didn’t even know I’d lost. The office version of me slowly faded, replaced by the ocean version—the one who thrives on saltwater, adventure, and endless curiosity. ',
      'A few months later, I completed my Instructor certification. Years later, I became a skipper on the dive boats.',
      'And this is only the beginning.',
    ],
    imageIds: ['leap-unknown-1', 'leap-unknown-2'],
  },
  {
    id: 'called-ocean',
    title: 'Called by the Ocean',
    paragraphs: [
      'From floating in the Caribbean as a child to working on reefs around the world, the journey was never just about the dives. It was about following a calling that had been whispering from beneath the waves since day one.',
      'This blog is my way of sharing that journey—with all its adventures, challenges, and magical moments underwater. It’s a space for stories from the reefs, glimpses into island life, travel experiences as a dive instructor, and my ongoing love affair with the ocean.',
      'This is where the story continues - above and below the surface.',
    ],
    imageIds: ['called-ocean-1', 'called-ocean-2'],
  },
  {
    id: 'where-now',
    title: 'Where I Am Now',
    paragraphs: [
      'Right now, I’m in a new chapter of my journey. After a year and a half living on Heron Island, a tiny island on the Great Barrier Reef in Australia, I’ve stepped back into the unknown.',
      'I’m currently traveling through Ecuador, Argentina, and Costa Rica—exploring, diving, reconnecting with family/friends and searching for wherever feels like home next.',
    ],
    imageIds: ['where-now-1', 'where-now-2'],
  },
  {
    id: 'the-team',
    title: 'The Team',
    paragraphs: [
      'This may be my story, but I’m not building it alone. This blog wouldn’t be possible without Juani. He’s the one behind the scenes helping bring everything to life—from building the blog to shaping ideas and making it all come together.',
      'If he’s not busy building websites, he’s diving, taking photos, or playing his guitar and singing.',
      'And together, we’re the team behind this space. I hope you enjoy the blog and find something in it for yourself. If you’ve ever thought about traveling, exploring, or leaving your comfort zone to pursue something more, take the risk—the world is full of experiences and memories that are truly invaluable.',
    ],
    imageIds: ['team-1', 'team-2'],
  },
];

const whatYoullFind = [
  'Dive and travel experiences around the world',
  'Stories from life above and below the surface',
  'Underwater and land-based photography',
  'A look into life as a dive instructor and skipper',
  'Stories, lessons, and moments from the journey',
  'Creative work and art inspired by life along the way',
];

/* ============================================================
   COMPONENT
   ============================================================ */

export function AboutPageContent({ settings }: { settings: SiteSettings }) {
  const imageCopyById = new Map(settings.aboutImageCopy.map((copy) => [copy.id, copy]));
  const getImage = (id: string) => {
    const definition = getAboutPageImageDefinition(id);
    if (!definition) return null;
    const copy = imageCopyById.get(id);

    return {
      ...definition,
      alt: copy?.alt.trim() || definition.defaultAlt,
      caption: copy?.caption ?? definition.defaultCaption,
    };
  };
  const heroCopy = getImage('about-hero');

  const shouldShowSectionDivider = (index: number) => {
    if (index === 0) return false;
    return Boolean(sections[index].title);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ============================================================
          HERO IMAGE - Full width underwater photo
          ============================================================ */}
      <section className="w-full">
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-gray-200">
          <Image
            src={settings.aboutHeroImage}
            alt={heroCopy?.alt || 'Katie diving underwater'}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="px-6 text-center">
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-light tracking-wide text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.3)]">
                {settings.aboutHeroTitle}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MAIN CONTENT - Editorial sections with photo grids
          ============================================================ */}
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-12 md:py-20">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={`${
              shouldShowSectionDivider(index)
                ? 'mt-20 border-t border-black/10 pt-20 md:mt-24 md:pt-24'
                : index === 0
                  ? 'pt-0'
                  : 'mt-10 md:mt-12'
            }`}
          >
            {/* Title */}
            {section.title && (
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-black mb-7 md:mb-8">
                {section.title}{' '}
                {section.titleAccent && (
                  <span className="italic font-light">{section.titleAccent}</span>
                )}
              </h2>
            )}

            {/* Paragraphs */}
            <div className="space-y-4 md:space-y-5 mb-8 md:mb-10">
              {section.paragraphs.map((p, i) => (
                <p key={i} className="font-body text-base leading-relaxed text-black/80">
                  {p}
                </p>
              ))}
            </div>

            {/* Photo Grid - 2 columns on desktop, stacked on mobile */}
            {section.imageIds && section.imageIds.length > 0 && (
              <div
                className={`grid gap-4 md:gap-5 ${
                  section.imageIds.length === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {section.imageIds.map((imageId) => {
                  const image = getImage(imageId);
                  if (!image?.src) return null;

                  return (
                    <div
                      key={image.id}
                      className="group relative aspect-[4/3] overflow-hidden bg-gray-100"
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {image.caption && (
                        <>
                          <div className="absolute inset-0 bg-ocean-dark/0 transition-colors duration-300 group-hover:bg-ocean-dark/58 group-focus-within:bg-ocean-dark/58" />
                          <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
                            <p className="font-body text-sm md:text-base leading-relaxed text-white">
                              {image.caption}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {/* ============================================================
            "Called by the Ocean" closing line
            ============================================================ */}
        <section className="text-center py-8">
          <p className="font-body text-lg text-black/70 mb-2">
            Welcome aboard.{' '}
            <span className="font-display text-2xl italic text-ocean">Dive in.</span>
          </p>
        </section>

        {/* ============================================================
            What You'll Find Here
            ============================================================ */}
        <section
          id="what-youll-find"
          className="mt-20 border-t border-black/10 pt-20 md:mt-24 md:pt-24 space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-10 items-start">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-black mb-6">
                What You&apos;ll <span className="italic font-bold">find here</span>
              </h2>
              <ul className="grid gap-3">
                {whatYoullFind.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 border border-black/8 bg-cream/70 px-4 py-3 transition-colors duration-300 hover:border-ocean/35 hover:bg-sky-50"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-ocean font-body text-[11px] text-white">
                      {i + 1}
                    </span>
                    <span className="font-body text-lg leading-relaxed text-black/82">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[4/5] max-w-sm md:max-w-xs overflow-hidden bg-gray-100">
              <Image
                src="/images/about/about-what-find-2.jpg"
                alt={getImage('what-youll-find-portrait')?.alt || "What you'll find here"}
                fill
                sizes="(min-width: 768px) 320px, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
            <Image
              src="/images/about/about-what-find-1.jpeg"
              alt={getImage('what-youll-find-wide')?.alt || 'Katie underwater adventure'}
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover"
            />
          </div>
        </section>
      </div>

      {/* ============================================================
          STATS SECTION
          ============================================================ */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: settings.aboutDiveSitesCount, label: 'Dive Sites' },
              { number: settings.aboutCountriesCount, label: 'Countries' },
              { number: settings.aboutDivesLoggedCount, label: 'Dives Logged' },
              { number: '3', label: 'Years Teaching' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="block font-display text-4xl md:text-5xl font-light text-ocean">
                  {stat.number}
                </span>
                <span className="font-body text-sm tracking-wider uppercase text-black/60 mt-2 block">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CERTIFIED BY
          ============================================================ */}
      <section className="py-12 md:py-16 bg-white border-y border-black/5">
        <div className="max-w-5xl mx-auto px-6 md:px-8 text-center">
          <h3 className="font-display text-xl md:text-2xl font-light text-black/70 mb-10">
            Certified By
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
            {['PADI'].map((cert) => (
              <span
                key={cert}
                className="font-display text-base md:text-lg font-medium text-black/70 tracking-widest"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          LET'S CONNECT CTA
          ============================================================ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-2xl mx-auto px-6 md:px-8 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-light text-black mb-4">
            Let&apos;s <span className="italic">Connect</span>
          </h2>
          <p className="font-body text-base text-black/60 mb-8">
            Have a question, a collaboration idea, or just want to say hi?
            <br />
            I&apos;d love to hear from you.
          </p>
          <Link
            href="/contact"
            className="btn-ocean inline-flex items-center gap-3"
          >
            <span>Get in Touch</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
