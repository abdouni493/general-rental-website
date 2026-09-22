import React, { useRef } from 'react';
import {
  motion, useScroll, useTransform, useSpring, useMotionValue, useReducedMotion, type MotionValue,
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
//   3. INCLINAISON 3D AU SURVOL — la carte s'oriente vers le curseur et un
//      halo violet le suit (variables --mx / --my lues par .spotlight).
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

  const y        = useTransform(eased, [0, 0.22, 0.85, 1], [64, 0, 0, -26]);
  const opacity  = useTransform(eased, [0, 0.18, 0.9, 1], [0, 1, 1, 0.35]);
  const scale    = useTransform(eased, [0, 0.24, 0.88, 1], [0.9, 1, 1, 0.97]);
  const rotateX  = useTransform(eased, [0, 0.26], [11, 0]);
  const blurPx   = useTransform(eased, [0, 0.2], [7, 0]);
  const filter   = useTransform(blurPx, (v: number) => `blur(${Math.max(0, v).toFixed(2)}px)`);

  // ── 2. Parallaxe de l'image ───────────────────────────────────────────────
  const imageY = useTransform(eased, [0, 1], ['-7%', '7%']);

  // ── 3. Inclinaison au survol ──────────────────────────────────────────────
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springTiltX = useSpring(tiltX, { stiffness: 260, damping: 22 });
  const springTiltY = useSpring(tiltY, { stiffness: 260, damping: 22 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    tiltY.set((px - 0.5) * 11);
    tiltX.set((0.5 - py) * 9);
    e.currentTarget.style.setProperty('--mx', `${px * 100}%`);
    e.currentTarget.style.setProperty('--my', `${py * 100}%`);
  };

  const handlePointerLeave = () => { tiltX.set(0); tiltY.set(0); };

  const accent = agencyColor(car.agencyColor);
  const effectivePrice = offer ? offer.newPrice : car.priceDay;

  const specs = [
    { icon: Fuel, value: car.energy },
    { icon: Cog, value: car.transmission },
    { icon: Users, value: `${car.seats}` },
    { icon: DoorOpen, value: `${car.doors}` },
  ];

  // Le mode « animations réduites » garde un fondu simple et rien d'autre.
  const motionStyle = reduce
    ? {}
    : { y, opacity, scale, rotateX, filter, transformPerspective: 1100 as any };

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
        onPointerLeave={handlePointerLeave}
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
        className="ring-aurora spotlight group relative rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full outline-none"
        style={{
          background: 'var(--color-panel)',
          border: '1px solid var(--color-line)',
          boxShadow: 'var(--shadow-panel)',
          transformStyle: 'preserve-3d',
          // L'inclinaison au survol vit sur le même style que l'habillage :
          // deux attributs `style` s'annuleraient l'un l'autre.
          ...(reduce ? {} : { rotateX: springTiltX, rotateY: springTiltY, transformPerspective: 1100 }),
        }}
      >
        {/* ── Visuel ── */}
        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'var(--color-panel-3)' }}>
          <motion.img
            src={car.image}
            alt={`${car.brand} ${car.model}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={reduce ? {} : { y: imageY, scale: 1.16 }}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.22]"
          />

          {/* Dégradé de lisibilité */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(5,6,15,0.82) 0%, rgba(5,6,15,0.15) 45%, transparent 70%)' }}
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
              className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-lg text-[10px] font-black backdrop-blur-md"
              style={{
                color: 'var(--color-aqua-light)',
                background: 'rgba(5,6,15,0.55)',
                border: '1px solid var(--color-aqua-soft)',
                fontFamily: 'var(--font-display)',
              }}
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
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
              className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg text-[11px] font-black text-white flex items-center gap-1"
              style={{
                background: 'linear-gradient(135deg, var(--color-magenta), var(--color-magenta-dark))',
                boxShadow: '0 6px 18px rgba(244, 113, 181, 0.4)',
                fontFamily: 'var(--font-display)',
              }}
            >
              <Tag size={11} /> −{discountPercent(offer)}%
            </motion.div>
          )}

          {/* Nom du véhicule, posé sur le visuel */}
          <div className="absolute bottom-3 left-3 right-24 z-10">
            <h3
              className="font-black text-base leading-tight truncate"
              style={{ color: '#F5F6FF', fontFamily: 'var(--font-display)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
            >
              {car.brand} <span style={{ color: 'var(--color-aqua-light)' }}>{car.model}</span>
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
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                style={{
                  color: 'var(--color-body)',
                  background: 'var(--color-panel-2)',
                  border: '1px solid var(--color-line-soft)',
                }}
              >
                <s.icon size={10} style={{ color: accent }} /> {s.value}
              </span>
            ))}
          </div>

          {/* Tarif */}
          <div className="flex items-end justify-between gap-2 mt-auto pt-1">
            <div className="min-w-0">
              {offer && (
                <p className="text-[11px] line-through leading-none mb-0.5" style={{ color: 'var(--color-faint)' }}>
                  {money(offer.oldPrice, lang)}
                </p>
              )}
              <p
                className="font-black text-xl leading-none truncate"
                style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
              >
                {money(effectivePrice, lang)}
                <span className="text-[11px] font-bold ml-1" style={{ color: 'var(--color-muted)' }}>
                  /{lang === 'fr' ? 'jour' : 'يوم'}
                </span>
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={e => { e.stopPropagation(); onBook(car); }}
              className="btn-aurora h-10 px-4 text-xs shrink-0"
              aria-label={lang === 'fr' ? `Réserver ${car.brand} ${car.model}` : `احجز ${car.brand} ${car.model}`}
            >
              {lang === 'fr' ? 'Réserver' : 'احجز'} <ArrowRight size={14} />
            </motion.button>
          </div>

          {/* Liseré de la couleur de l'agence, révélé au survol */}
          <span
            className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500"
            style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
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
    className="rounded-2xl overflow-hidden"
    style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}
  >
    <div className="aspect-[4/3] skeleton" />
    <div className="p-4 space-y-3">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-6 w-14 rounded-lg skeleton" />)}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="h-7 w-24 rounded-lg skeleton" />
        <div className="h-10 w-24 rounded-xl skeleton" />
      </div>
    </div>
  </motion.div>
);
