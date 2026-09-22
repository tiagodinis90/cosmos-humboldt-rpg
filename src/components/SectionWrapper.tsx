import { ReactNode } from 'react';

interface SectionWrapperProps {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function SectionWrapper({ id, number, title, subtitle, children }: SectionWrapperProps) {
  return (
    <section id={id} className="relative py-24 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="mb-16 text-center">
          <span className="inline-block font-mono text-gold-500 text-sm tracking-[0.3em] uppercase mb-4">
            {number}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-parchment mb-4 leading-tight">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-forest-300 italic max-w-2xl mx-auto">
            {subtitle}
          </p>
          <div className="ornament-divider max-w-xs mx-auto mt-8">
            <span className="text-gold-600 text-sm">❧</span>
          </div>
        </div>

        {/* Section content */}
        <div className="prose-custom">
          {children}
        </div>
      </div>
    </section>
  );
}
