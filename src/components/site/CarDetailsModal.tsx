import React from 'react';
import { motion } from 'motion/react';
import {
  X, Fuel, Cog, Users, DoorOpen, Palette, Hash, Calendar,
  ShieldCheck, ArrowRight, MapPin,
} from 'lucide-react';
import type { Car, SpecialOffer, Language } from '../../types';
import { money, discountPercent, agencyColor, agencyTint } from '../../utils/format';
import { useApp } from '../../context/AppContext';

// ============================================================================
// Fiche véhicule — ouverte au clic sur une carte.
// Rappelle en évidence l'agence propriétaire et SES lieux de retrait : c'est
// ce qui explique au client pourquoi l'étape « Lieu de départ » ne proposera
// que ces points-là.
// ============================================================================

export const CarDetailsModal: React.FC<{
  car: Car;
  offer?: SpecialOffer;
  lang: Language;
  onClose: () => void;
  onBook: (car: Car) => void;
}> = ({ car, offer, lang, onClose, onBook }) => {
  const { pointsOfAgency } = useApp();
  const points = pointsOfAgency(car.agencyKey);
  const accent = agencyColor(car.agencyColor);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const specs = [
    { icon: Fuel, label: { fr: 'Énergie', ar: 'الوقود' }, value: car.energy },
    { icon: Cog, label: { fr: 'Boîte', ar: 'ناقل الحركة' }, value: car.transmission },
    { icon: Users, label: { fr: 'Places', ar: 'المقاعد' }, value: `${car.seats}` },
    { icon: DoorOpen, label: { fr: 'Portes', ar: 'الأبواب' }, value: `${car.doors}` },
    { icon: Palette, label: { fr: 'Couleur', ar: 'اللون' }, value: car.color },
    { icon: Calendar, label: { fr: 'Année', ar: 'السنة' }, value: car.year ? `${car.year}` : '—' },
  ];

  const prices = [
    { label: { fr: 'Par jour', ar: 'لليوم' }, value: offer ? offer.newPrice : car.priceDay, strike: offer?.oldPrice, highlight: true },
    { label: { fr: 'Tarif semaine /jour', ar: 'سعر الأسبوع /يوم' }, value: car.priceWeek },
    { label: { fr: 'Tarif mois /jour', ar: 'سعر الشهر /يوم' }, value: car.priceMonth },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.76)', backdropFilter: 'blur(10px)' }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${car.brand} ${car.model}`}
        initial={{ opacity: 0, scale: 0.93, y: 26 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 14 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl"
        style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-lift)' }}
      >
        <button
          onClick={onClose}
          aria-label={lang === 'fr' ? 'Fermer' : 'إغلاق'}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-md"
          style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid var(--color-line)', color: '#fff' }}
        >
          <X size={17} />
        </button>

        {/* ── Visuel ── */}
        <div className="relative h-56 sm:h-72 overflow-hidden rounded-t-3xl" style={{ background: 'var(--color-panel-3)' }}>
          <img
            src={car.image}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, var(--color-panel) 2%, rgba(0,0,0,0.35) 48%, transparent 100%)' }}
          />

          <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold mb-2"
                style={{ color: accent, background: agencyTint(car.agencyColor, 0.18), border: `1px solid ${agencyTint(car.agencyColor, 0.4)}`, fontFamily: 'var(--font-display)' }}
              >
                <ShieldCheck size={12} /> {car.agencyName}
              </span>
              <h2
                className="font-black text-2xl sm:text-3xl leading-tight"
                style={{ color: '#FFFFFF', fontFamily: 'var(--font-display)', textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
              >
                {car.brand} <span style={{ color: 'var(--color-aqua-light)' }}>{car.model}</span>
              </h2>
            </div>

            {offer && (
              <span
                className="px-3 py-1.5 rounded-xl text-sm font-black text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--color-magenta), var(--color-magenta-dark))', fontFamily: 'var(--font-display)' }}
              >
                −{discountPercent(offer)}%
              </span>
            )}
          </div>
        </div>

        {/* ── Corps ── */}
        <div className="p-5 sm:p-7 space-y-6">

          {/* Caractéristiques */}
          <div>
            <SectionTitle>{lang === 'fr' ? 'Caractéristiques' : 'المواصفات'}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {specs.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  className="rounded-xl p-3 flex items-center gap-2.5"
                  style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: agencyTint(car.agencyColor, 0.12) }}
                  >
                    <s.icon size={15} style={{ color: accent }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-faint)' }}>
                      {s.label[lang]}
                    </p>
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--color-title)' }}>{s.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tarifs */}
          <div>
            <SectionTitle>{lang === 'fr' ? 'Tarifs' : 'الأسعار'}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {prices.map((p, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4"
                  style={{
                    background: p.highlight ? 'var(--color-iris-soft)' : 'var(--color-panel-2)',
                    border: `1px solid ${p.highlight ? 'var(--color-line)' : 'var(--color-line-soft)'}`,
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-muted)' }}>
                    {p.label[lang]}
                  </p>
                  {p.strike && (
                    <p className="text-[11px] line-through" style={{ color: 'var(--color-faint)' }}>
                      {money(p.strike, lang)}
                    </p>
                  )}
                  <p
                    className="font-black text-lg"
                    style={{ color: p.highlight ? 'var(--color-iris)' : 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                  >
                    {money(p.value, lang)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
              <Hash size={12} /> {lang === 'fr' ? 'Caution' : 'الضمان'} : <strong style={{ color: 'var(--color-title)' }}>{money(car.deposit, lang)}</strong>
            </p>
          </div>

          {/* Lieux de retrait de l'agence propriétaire */}
          {points.length > 0 && (
            <div>
              <SectionTitle>
                {lang === 'fr' ? `Retrait chez ${car.agencyName}` : `الاستلام لدى ${car.agencyName}`}
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                {points.map(p => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ color: 'var(--color-body)', background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
                  >
                    <MapPin size={12} style={{ color: accent }} />
                    {p.name}{p.city ? ` · ${p.city}` : ''}
                  </span>
                ))}
              </div>
              <p className="text-[11px] mt-2.5" style={{ color: 'var(--color-faint)' }}>
                {lang === 'fr'
                  ? "Seuls les lieux de cette agence sont proposés : c'est elle qui vous remettra le véhicule."
                  : 'تُقترح فقط مواقع هذه الوكالة: فهي من ستسلّمك السيارة.'}
              </p>
            </div>
          )}

          {offer?.note && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{ background: 'var(--color-magenta-soft)', border: '1px solid rgba(212,0,42,0.28)', color: 'var(--color-body)' }}
            >
              {offer.note}
            </div>
          )}

          <button onClick={() => onBook(car)} className="btn-aurora w-full h-14 text-sm">
            {lang === 'fr' ? 'Réserver ce véhicule' : 'احجز هذه السيارة'} <ArrowRight size={17} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3
    className="text-[11px] font-bold uppercase tracking-[0.16em] mb-3"
    style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
  >
    {children}
  </h3>
);
