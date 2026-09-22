import React, { useRef } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useReducedMotion,
} from 'motion/react';
import { Fuel, Cog, Users, DoorOpen, ArrowRight, Tag } from 'lucide-react';
import type { Car, SpecialOffer, Language } from '../../types';
import { money, discountPercent, agencyColor, agencyTint } from '../../utils/format';
import { AgencyBadge } from '../ui/Primitives';

// ============================================================================
// Carte véhicule — l'objet le plus vu du site, donc celui qui porte
// l'animation signature du portail.
//
// Trois couches se superposent, toutes désactivées si l'utilisateur a demandé
// moins d'animations (prefers-reduced-motion) :
//
//   1. RÉVÉLATION LIÉE AU DÉFILEMENT — chaque carte est suivie
//      individuellement par useScroll. En entrant par le bas de l'écran elle
//      monte, se déplie (rotateX) et se met au net (blur → 0) ; en sortant par
//      le haut elle s'efface. Le mouvement suit le doigt, il n'est pas joué
//      une fois pour toutes.
//   2. PARALLAXE D'IMAGE — la photo glisse plus lentement que la carte, ce qui
//      donne de la profondeur à la grille pendant le défilement.
//   3. HALO AU SURVOL — un voile rouge suit le curseur (variables --mx / --my
//      lues par .spotlight) et la carte prend le contour rouge d'Avis.
//
// Habillage : carte blanche à angles vifs, photo 16/9 coiffée d'un voile noir,
// titre en capitales posé dessus et tarif en rouge de marque — la « offer card »
// d'avis.com transposée au portail. L'inclinaison 3D de l'ancien thème a été
// retirée : l'interface d'Avis est strictement plane.
// ============================================================================

interface CarCardProps {
  car: Car;
  offer?: SpecialOffer;
  lang: Language;
  index: number;
  onOpen: (car: Car) => void;
  onBook: (car: Car) => void;
  /** Masque la pastille d'agence quand la grille est déjà filtrée. */
  hideAgency?: boolean;
}

export const CarCard: React.FC<CarCardProps> = ({
  car, offer, lang, index, onOpen, onBook, hideAgency = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // ── 1. Révélation liée au défilement ──────────────────────────────────────
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 96%', 'end 8%'],
  });
  const eased = useSpring(scrollYProgress, { stiffness: 110, damping: 26, restDelta: 0.001 });

  const y        = useTransform(eased, [0, 0.22, 0.9, 1], [48, 0, 0, -14]);
  const opacity  = useTransform(eased, [0, 0.18, 0.92, 1], [0, 1, 1, 0.55]);

  // ── 2. Parallaxe de l'image ───────────────────────────────────────────────
  const imageY = useTransform(eased, [0, 1], ['-7%', '7%']);

  // ── 3. Halo au survol ─────────────────────────────────────────────────────
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    e.currentTarget.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  const accent = agencyColor(car.agencyColor);
  const effectivePrice = offer ? offer.newPrice : car.priceDay;

  const specs = [
    { icon: Fuel, value: car.energy },
    { icon: Cog, value: car.transmission },
    { icon: Users, value: `${car.seats}` },
    { icon: DoorOpen, value: `${car.doors}` },
  ];

  // Le mode « animations réduites » garde un fondu simple et rien d'autre.
  const motionStyle = reduce ? {} : { y, opacity };

  return (
    <motion.div
      ref={ref}
      style={motionStyle}
      initial={reduce ? { opacity: 0 } : undefined}
      animate={reduce ? { opacity: 1 } : undefined}
      transition={reduce ? { duration: 0.3, delay: Math.min(index, 6) * 0.03 } : undefined}
      className="will-change-transform"
    >
      <motion.article
        onPointerMove={handlePointerMove}
        onClick={() => onOpen(car)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(car); }
        }}
        role="button"
        tabIndex={0}
        aria-label={
          lang === 'fr'
            ? `${car.brand} ${car.model} chez ${car.agencyName} — voir les détails`
            : `${car.brand} ${car.model} — ${car.agencyName}`
        }
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="ring-aurora spotlight group relative overflow-hidden cursor-pointer flex flex-col h-full outline-none"
        style={{
          background: 'var(--color-panel)',
          border: '1px solid var(--color-line)',
          boxShadow: 'var(--shadow-panel)',
          borderRadius: '4px',
        }}
      >
        {/* ── Visuel : le cadrage 16/9 des cartes d'offre d'Avis ── */}
        <div className="relative aspect-[16/10] overflow-hidden" style={{ background: 'var(--color-panel-3)' }}>
          <motion.img
            src={car.image}
            alt={`${car.brand} ${car.model}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={reduce ? {} : { y: imageY, scale: 1.12 }}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.18]"
          />

          {/* Voile noir de lisibilité — le scrim des visuels d'Avis */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 42%, transparent 72%)' }}
          />

          {/* Pastille d'agence — l'information la plus importante de la carte */}
          {!hideAgency && (
            <div className="absolute top-3 left-3 z-10">
              <AgencyBadge name={car.agencyName} color={car.agencyColor} logo={car.agencyLogo} />
            </div>
          )}

          {/* Année */}
          {car.year && (
            <div
              className="absolute top-3 right-3 z-10 px-2 py-1 text-[10px] font-extrabold tracking-wide text-white"
              style={{ background: 'rgba(0,0,0,0.72)', fontFamily: 'var(--font-display)' }}
            >
              {car.year}
            </div>
          )}

          {/* Promotion */}
          {offer && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
              className="absolute top-3 right-3 z-20 px-2.5 py-1 text-[11px] font-extrabold text-white flex items-center gap-1"
              style={{ background: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
            >
              <Tag size={11} /> −{discountPercent(offer)}%
            </motion.div>
          )}

          {/* Nom du véhicule, posé sur le visuel */}
          <div className="absolute bottom-3 left-3 right-4 z-10">
            <h3 className="avis-headline text-lg truncate text-white">
              {car.brand} <span style={{ color: '#FF4D6D' }}>{car.model}</span>
            </h3>
          </div>
        </div>

        {/* ── Contenu ── */}
        <div className="p-4 flex flex-col gap-3 flex-1 relative z-[2]">
          {/* Caractéristiques */}
          <div className="flex flex-wrap gap-1.5">
            {specs.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold"
                style={{
                  color: 'var(--color-body)',
                  background: 'var(--color-panel-2)',
                  border: '1px solid var(--color-line)',
                }}
              >
                <s.icon size={10} style={{ color: accent }} /> {s.value}
              </span>
            ))}
          </div>

          {/* Tarif : prix sur sa propre ligne, bouton pleine largeur dessous —
              la mise en page des cartes d'offre d'Avis, qui ne tronque jamais
              le montant quelle que soit la largeur de la colonne. */}
          <div className="flex flex-col gap-3 mt-auto pt-1">
            <div className="min-w-0">
              {offer && (
                <p className="text-[11px] line-through leading-none mb-0.5" style={{ color: 'var(--color-faint)' }}>
                  {money(offer.oldPrice, lang)}
                </p>
              )}
              <p className="avis-headline text-2xl" style={{ color: 'var(--color-iris)' }}>
                {money(effectivePrice, lang)}
                <span className="text-[11px] font-bold ml-1" style={{ color: 'var(--color-muted)' }}>
                  /{lang === 'fr' ? 'jour' : 'يوم'}
                </span>
              </p>
            </div>

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ y: 0 }}
              onClick={e => { e.stopPropagation(); onBook(car); }}
              className="btn-aurora avis-arrow h-11 w-full text-xs uppercase tracking-[0.04em]"
              aria-label={lang === 'fr' ? `Réserver ${car.brand} ${car.model}` : `احجز ${car.brand} ${car.model}`}
            >
              {lang === 'fr' ? 'Réserver' : 'احجز'} <ArrowRight size={14} />
            </motion.button>
          </div>

          {/* Liseré de la couleur de l'agence, révélé au survol */}
          <span
            className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500 ease-out"
            style={{ background: accent }}
          />
        </div>
      </motion.article>
    </motion.div>
  );
};

// ─── Carte fantôme pendant le chargement ────────────────────────────────────

export const CarCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06 }}
    className="overflow-hidden"
    style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)', borderRadius: '4px' }}
  >
    <div className="aspect-[16/10] skeleton" />
    <div className="p-4 space-y-3">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-6 w-14 skeleton" />)}
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-7 w-28 skeleton" />
        <div className="h-11 w-full skeleton" />
      </div>
    </div>
  </motion.div>
);
