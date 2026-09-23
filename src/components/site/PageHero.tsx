import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import type { HeroImageKey } from '../../services/SiteSettingsService';

// ============================================================================
// Bandeau d'en-tête des pages intérieures.
// ----------------------------------------------------------------------------
// Repris tel quel des pages secondaires d'avis.com : une photo pleine largeur,
// un voile noir dégradé vers la droite, un sur-titre rouge et un titre en
// capitales calés à gauche, puis un filet rouge de 4 px qui referme le bloc.
//
// Les visuels sont servis par le CDN d'Unsplash (libres de droits, format et
// qualité négociés dans l'URL) — jamais par le CDN d'une marque tierce.
// ============================================================================

/** Visuels par page : clés de SiteSettings.images, modifiables dans « Paramètres ». */
export const HERO_IMAGES = {
  fleet: 'fleet',
  promotions: 'promotions',
  agencies: 'agencies',
  contact: 'contact',
  booking: 'booking',
} as const satisfies Record<string, HeroImageKey>;

interface PageHeroProps {
  /** Sur-titre rouge, en petites capitales. */
  eyebrow: React.ReactNode;
  /** Titre principal — composé en capitales par `.avis-headline`. */
  title: React.ReactNode;
  /** Phrase d'accroche sous le titre. */
  description?: React.ReactNode;
  image: HeroImageKey;
  /** Cadrage vertical de la photo (`object-position`). */
  focus?: string;
}

export const PageHero: React.FC<PageHeroProps> = ({
  eyebrow, title, description, image, focus = 'center 50%',
}) => {
  const reduce = useReducedMotion();
  const { settings } = useSiteSettings();

  return (
    <section className="on-photo relative overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <img
          src={settings.images[image]}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover ${reduce ? '' : 'avis-kenburns'}`}
          style={{ objectPosition: focus }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.3) 100%)',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-14"
      >
        <p
          className="text-[11px] font-extrabold uppercase tracking-[0.18em] mb-3 inline-flex items-center gap-2"
          style={{ color: '#FF4D6D', fontFamily: 'var(--font-display)' }}
        >
          {eyebrow}
        </p>
        <h1 className="avis-headline text-4xl sm:text-5xl lg:text-6xl text-white">{title}</h1>
        {description && (
          <p className="text-sm sm:text-base mt-4 max-w-2xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.84)' }}>
            {description}
          </p>
        )}
      </motion.div>

      {/* Filet rouge de marque qui referme le bandeau */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'var(--color-iris)' }} />
    </section>
  );
};
