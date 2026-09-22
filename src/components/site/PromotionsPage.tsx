import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Tag, Sparkles, ArrowRight, CalendarClock, Percent } from 'lucide-react';

import { useApp } from '../../context/AppContext';
import { AgencyFilter } from './AgencyFilter';
import { CarDetailsModal } from './CarDetailsModal';
import { EmptyState } from '../ui/Primitives';
import { AgencyBadge } from '../ui/Primitives';
import { money, discountPercent, agencyColor, agencyTint } from '../../utils/format';
import { formatDate } from '../../utils/dates';
import type { Car, SpecialOffer } from '../../types';

// ============================================================================
// Page « Promotions » — uniquement les véhicules portant une offre spéciale
// active, toutes agences confondues, filtrable par agence.
// ============================================================================

export const PromotionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang, specialOffers, agencyFilter, isLoading } = useApp();
  const [detailCar, setDetailCar] = useState<Car | null>(null);

  const visible = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    return specialOffers
      .filter(o => {
        if (!o.car || !o.isActive) return false;
        if (agencyFilter && o.agencyKey !== agencyFilter) return false;
        if (o.startDate && now < o.startDate) return false;
        if (o.endDate && now > o.endDate) return false;
        return o.newPrice > 0 && o.newPrice < o.oldPrice;
      })
      .sort((a, b) => discountPercent(b) - discountPercent(a));
  }, [specialOffers, agencyFilter]);

  const openBooking = (car: Car) =>
    navigate('/reserver', { state: { carId: car.id, agencyKey: car.agencyKey } });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-ink)' }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em] mb-3 inline-flex items-center gap-2"
            style={{ color: 'var(--color-magenta)', fontFamily: 'var(--font-display)' }}
          >
            <Sparkles size={13} /> {lang === 'fr' ? 'Bons plans' : 'عروض'}
          </p>
          <h1
            className="font-black text-4xl sm:text-6xl leading-tight"
            style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
          >
            {lang === 'fr' ? 'Offres ' : ''}
            <span className="text-aurora">{lang === 'fr' ? 'spéciales' : 'عروض خاصة'}</span>
          </h1>
          <p className="text-sm sm:text-base mt-4 max-w-2xl mx-auto" style={{ color: 'var(--color-muted)' }}>
            {lang === 'fr'
              ? 'Les promotions en cours dans toutes nos agences partenaires, réunies sur une seule page.'
              : 'العروض الجارية في كل وكالاتنا الشريكة في صفحة واحدة.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-strong rounded-2xl p-5 mb-9"
        >
          <AgencyFilter variant="full" />
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-line)' }}>
                <div className="h-48 skeleton" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-40 rounded skeleton" />
                  <div className="h-9 w-full rounded-xl skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Tag}
            title={lang === 'fr' ? 'Aucune promotion en cours' : 'لا توجد عروض حاليا'}
            description={
              lang === 'fr'
                ? "Revenez bientôt : les agences publient régulièrement de nouvelles offres. En attendant, parcourez la flotte complète."
                : 'عد قريبا: تنشر الوكالات عروضا جديدة بانتظام.'
            }
            action={
              <button onClick={() => navigate('/offres')} className="btn-aurora h-11 px-6 text-xs mt-2">
                {lang === 'fr' ? 'Voir tous les véhicules' : 'عرض كل السيارات'} <ArrowRight size={14} />
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map((offer, i) => (
              <OfferCard
                key={`${offer.agencyKey}-${offer.id}`}
                offer={offer}
                index={i}
                lang={lang}
                onOpen={() => offer.car && setDetailCar(offer.car)}
                onBook={() => offer.car && openBooking(offer.car)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {detailCar && (
          <CarDetailsModal
            car={detailCar}
            offer={visible.find(o => o.carId === detailCar.id)}
            lang={lang}
            onClose={() => setDetailCar(null)}
            onBook={car => { setDetailCar(null); openBooking(car); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Carte d'offre ───────────────────────────────────────────────────────────

const OfferCard: React.FC<{
  offer: SpecialOffer;
  index: number;
  lang: 'fr' | 'ar';
  onOpen: () => void;
  onBook: () => void;
}> = ({ offer, index, lang, onOpen, onBook }) => {
  const reduce = useReducedMotion();
  const car = offer.car!;
  const percent = discountPercent(offer);
  const accent = agencyColor(offer.agencyColor);
  const saving = (offer.oldPrice - offer.newPrice) || 0;

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 46, rotateX: 8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: Math.min(index % 6, 5) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? {} : { y: -7 }}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
      role="button"
      tabIndex={0}
      className="ring-aurora relative rounded-2xl overflow-hidden cursor-pointer flex flex-col outline-none"
      style={{
        background: 'var(--color-panel)',
        border: '1px solid var(--color-line)',
        boxShadow: 'var(--shadow-panel)',
        transformPerspective: 1000,
      }}
    >
      {/* Visuel */}
      <div className="relative h-48 overflow-hidden" style={{ background: 'var(--color-panel-3)' }}>
        <img
          src={car.image}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(5,6,15,0.85), rgba(5,6,15,0.1) 55%, transparent)' }}
        />

        <div className="absolute top-3 left-3">
          <AgencyBadge name={offer.agencyName} color={offer.agencyColor} logo={offer.agencyLogo} />
        </div>

        {/* Rosace de remise */}
        <motion.div
          initial={reduce ? {} : { scale: 0, rotate: -30 }}
          whileInView={{ scale: 1, rotate: -8 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.18 }}
          className="absolute top-3 right-3 w-16 h-16 rounded-full flex flex-col items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg, var(--color-magenta), var(--color-magenta-dark))',
            boxShadow: '0 8px 26px rgba(244,113,181,0.45)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <span className="font-black text-xl leading-none">−{percent}</span>
          <span className="text-[9px] font-bold tracking-wider opacity-90">%</span>
        </motion.div>

        <div className="absolute bottom-3 left-4 right-4">
          {offer.label && (
            <span
              className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black mb-1.5 text-white"
              style={{ background: accent, fontFamily: 'var(--font-display)' }}
            >
              {offer.label}
            </span>
          )}
          <h3
            className="font-black text-lg leading-tight truncate"
            style={{ color: '#F5F6FF', fontFamily: 'var(--font-display)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            {car.brand} <span style={{ color: 'var(--color-aqua-light)' }}>{car.model}</span>
          </h3>
        </div>
      </div>

      {/* Corps */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs line-through mb-0.5" style={{ color: 'var(--color-faint)' }}>
              {money(offer.oldPrice, lang)}
            </p>
            <p
              className="font-black text-2xl leading-none"
              style={{ color: 'var(--color-magenta)', fontFamily: 'var(--font-display)' }}
            >
              {money(offer.newPrice, lang)}
              <span className="text-[11px] font-bold ml-1" style={{ color: 'var(--color-muted)' }}>
                /{lang === 'fr' ? 'jour' : 'يوم'}
              </span>
            </p>
          </div>

          <div
            className="px-3 py-2 rounded-xl text-right shrink-0"
            style={{ background: agencyTint(offer.agencyColor, 0.1), border: `1px solid ${agencyTint(offer.agencyColor, 0.28)}` }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
              {lang === 'fr' ? 'Économie' : 'التوفير'}
            </p>
            <p className="font-black text-sm" style={{ color: accent, fontFamily: 'var(--font-display)' }}>
              {money(saving, lang)}
            </p>
          </div>
        </div>

        {(offer.startDate || offer.endDate) && (
          <p className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--color-faint)' }}>
            <CalendarClock size={12} />
            {offer.endDate
              ? `${lang === 'fr' ? "Jusqu'au" : 'حتى'} ${formatDate(offer.endDate, lang)}`
              : `${lang === 'fr' ? 'À partir du' : 'ابتداء من'} ${formatDate(offer.startDate!, lang)}`}
          </p>
        )}

        {offer.note && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--color-muted)' }}>
            {offer.note}
          </p>
        )}

        <button
          onClick={e => { e.stopPropagation(); onBook(); }}
          className="btn-aurora w-full h-11 text-xs mt-auto"
        >
          <Percent size={14} /> {lang === 'fr' ? 'Profiter de l’offre' : 'استفد من العرض'}
        </button>
      </div>
    </motion.article>
  );
};
