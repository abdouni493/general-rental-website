import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, useScroll, useTransform, useSpring, useReducedMotion, AnimatePresence,
} from 'motion/react';
import {
  Search, CalendarDays, Building2, ArrowRight, ChevronDown, Sparkles,
  ShieldCheck, Zap, Layers, Car as CarIcon, MapPin, Star,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';
import { CarCard, CarCardSkeleton } from './CarCard';
import { CarDetailsModal } from './CarDetailsModal';
import { AgencyFilter } from './AgencyFilter';
import { EmptyState, ErrorBanner } from '../ui/Primitives';
import { today, addDays } from '../../utils/dates';
import { currentOfferForCar, money, agencyColor, agencyTint } from '../../utils/format';
import type { Car } from '../../types';

// ============================================================================
// Page d'accueil
// ----------------------------------------------------------------------------
// Trois promesses tenues dès le premier écran :
//   1. chercher une période et repartir avec la liste des voitures libres ;
//   2. filtrer par agence pour ne voir qu'une seule enseigne ;
//   3. constater d'un coup d'œil combien d'agences et de véhicules le portail
//      réunit réellement.
// ============================================================================

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    lang, agencies, cars, filteredCars, specialOffers,
    isLoading, loadError, reload, agencyFilter,
  } = useApp();

  const [detailCar, setDetailCar] = useState<Car | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // Parallaxe du hero : le contenu s'éloigne pendant que la page défile.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const orbY = useTransform(scrollYProgress, [0, 1], [0, -180]);

  // Sélection mise en avant : les véhicules les moins chers de chaque agence,
  // pour que la vitrine reste équilibrée entre les enseignes.
  const featured = useMemo(() => {
    const perAgency = new Map<string, Car[]>();
    for (const car of filteredCars) {
      const list = perAgency.get(car.agencyKey) || [];
      list.push(car);
      perAgency.set(car.agencyKey, list);
    }
    const picks: Car[] = [];
    const buckets = [...perAgency.values()].map(list =>
      [...list].sort((a, b) => a.priceDay - b.priceDay),
    );
    // Tour de table : une voiture par agence, puis on recommence.
    for (let round = 0; round < 4; round++) {
      for (const bucket of buckets) {
        if (bucket[round]) picks.push(bucket[round]);
      }
    }
    return picks.slice(0, 8);
  }, [filteredCars]);

  const openBooking = (car?: Car) => {
    navigate('/reserver', car ? { state: { carId: car.id, agencyKey: car.agencyKey } } : undefined);
  };

  return (
    <div>
      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden min-h-[92vh] flex items-center">
        <HeroBackdrop orbY={reduce ? undefined : orbY} />

        <motion.div
          style={reduce ? {} : { y: heroY, opacity: heroOpacity }}
          className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20"
        >
          {/* Accroche */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-4xl mx-auto mb-10"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] mb-7"
              style={{
                color: 'var(--color-aqua)',
                background: 'var(--color-aqua-soft)',
                border: '1px solid var(--color-aqua-soft)',
                fontFamily: 'var(--font-display)',
              }}
            >
              <Sparkles size={13} />
              {lang === 'fr'
                ? `${agencies.length} agences · ${cars.length} véhicules`
                : `${agencies.length} وكالات · ${cars.length} سيارة`}
            </motion.span>

            <h1
              className="font-black text-4xl sm:text-6xl lg:text-7xl leading-[1.04] tracking-tight mb-6"
              style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
            >
              {lang === 'fr' ? (
                <>
                  Toutes les agences.<br />
                  <span className="text-aurora">Une seule réservation.</span>
                </>
              ) : (
                <>
                  كل الوكالات.<br />
                  <span className="text-aurora">حجز واحد.</span>
                </>
              )}
            </h1>

            <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {lang === 'fr'
                ? "Comparez les flottes de nos agences partenaires en un seul endroit. Votre réservation part directement à l'agence qui possède le véhicule choisi."
                : 'قارن أساطيل وكالاتنا الشريكة في مكان واحد. يصل حجزك مباشرة إلى الوكالة المالكة للسيارة المختارة.'}
            </p>
          </motion.div>

          {/* Panneau de recherche */}
          <SearchPanel />

          {/* Filtre d'agence dès le landing */}
          {agencies.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mt-8 flex flex-col items-center gap-3"
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: 'var(--color-faint)', fontFamily: 'var(--font-display)' }}
              >
                {lang === 'fr' ? 'Ou parcourez une agence en particulier' : 'أو تصفح وكالة معينة'}
              </p>
              <AgencyFilter variant="compact" className="flex justify-center" />
            </motion.div>
          )}
        </motion.div>

        {/* Indicateur de défilement */}
        <motion.div
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none"
          style={{ color: 'var(--color-muted)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ fontFamily: 'var(--font-display)' }}>
            {lang === 'fr' ? 'Défiler' : 'مرر'}
          </span>
          <ChevronDown size={16} />
        </motion.div>
      </section>

      {/* ══════════════════════════ CHIFFRES ══════════════════════════ */}
      <StatsBand />

      {/* ══════════════════════════ SÉLECTION ══════════════════════════ */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--color-ink)' }}>
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            eyebrow={lang === 'fr' ? 'Sélection du moment' : 'اختيار اللحظة'}
            title={lang === 'fr' ? 'Une vitrine, plusieurs enseignes' : 'واجهة واحدة، عدة علامات'}
            description={
              agencyFilter
                ? lang === 'fr'
                  ? "Vous consultez une seule agence. Retirez le filtre pour voir toute l'offre."
                  : 'أنت تتصفح وكالة واحدة. أزل التصفية لرؤية كل العروض.'
                : lang === 'fr'
                  ? "Les meilleurs tarifs de chaque agence, côte à côte. Chaque carte indique l'enseigne qui loue le véhicule."
                  : 'أفضل الأسعار من كل وكالة جنبا إلى جنب.'
            }
          />

          {loadError && <div className="mb-8"><ErrorBanner message={loadError} onRetry={reload} /></div>}

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {isLoading
              ? Array.from({ length: 8 }, (_, i) => <CarCardSkeleton key={i} index={i} />)
              : featured.map((car, i) => (
                  <CarCard
                    key={`${car.agencyKey}-${car.id}`}
                    car={car}
                    offer={currentOfferForCar(car.id, specialOffers)}
                    lang={lang}
                    index={i}
                    onOpen={setDetailCar}
                    onBook={openBooking}
                    hideAgency={!!agencyFilter}
                  />
                ))}
          </div>

          {!isLoading && featured.length === 0 && (
            <EmptyState
              icon={CarIcon}
              title={lang === 'fr' ? 'Aucun véhicule disponible' : 'لا توجد سيارات متاحة'}
              description={
                agencies.length === 0
                  ? lang === 'fr'
                    ? "Aucune agence n'est encore connectée au portail. Connectez-en une depuis l'espace d'administration."
                    : 'لم يتم ربط أي وكالة بالبوابة بعد.'
                  : lang === 'fr'
                    ? 'Les agences connectées ne publient aucun véhicule pour le moment.'
                    : 'الوكالات المتصلة لا تنشر أي سيارة حاليا.'
              }
            />
          )}

          {!isLoading && filteredCars.length > featured.length && (
            <div className="flex justify-center mt-12">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/offres')}
                className="btn-ghost h-13 px-8 py-4 text-sm"
              >
                {lang === 'fr'
                  ? `Voir les ${filteredCars.length} véhicules`
                  : `عرض ${filteredCars.length} سيارة`}
                <ArrowRight size={16} />
              </motion.button>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════ COMMENT ÇA MARCHE ══════════════════════════ */}
      <HowItWorks />

      {/* ══════════════════════════ AGENCES ══════════════════════════ */}
      <AgenciesBand />

      {/* ══════════════════════════ APPEL À L'ACTION ══════════════════════════ */}
      <FinalCta />

      <AnimatePresence>
        {detailCar && (
          <CarDetailsModal
            car={detailCar}
            offer={currentOfferForCar(detailCar.id, specialOffers)}
            lang={lang}
            onClose={() => setDetailCar(null)}
            onBook={car => { setDetailCar(null); openBooking(car); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Décor du hero ───────────────────────────────────────────────────────────

const HeroBackdrop: React.FC<{ orbY?: any }> = ({ orbY }) => (
  <>
    <div className="absolute inset-0 bg-grid opacity-[0.35] pointer-events-none" />

    <motion.div
      style={orbY ? { y: orbY } : {}}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.72, 0.5] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 left-[6%] w-[36rem] h-[36rem] rounded-full"
        style={{ background: 'radial-gradient(circle, var(--color-iris-glow), transparent 66%)', filter: 'blur(38px)' }}
      />
      <motion.div
        animate={{ scale: [1.15, 1, 1.15], opacity: [0.38, 0.6, 0.38] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[18%] right-[2%] w-[30rem] h-[30rem] rounded-full"
        style={{ background: 'radial-gradient(circle, var(--color-aqua-glow), transparent 66%)', filter: 'blur(44px)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.22, 1], opacity: [0.24, 0.42, 0.24] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-12%] left-[32%] w-[28rem] h-[28rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(244,113,181,0.3), transparent 66%)', filter: 'blur(46px)' }}
      />
    </motion.div>

    {/* Fondu vers la section suivante */}
    <div
      className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
      style={{ background: 'linear-gradient(to bottom, transparent, var(--color-ink))' }}
    />
  </>
);

// ─── Panneau de recherche de disponibilité ───────────────────────────────────

const SearchPanel: React.FC = () => {
  const navigate = useNavigate();
  const { lang, agencies, agencyFilter, setAgencyFilter } = useApp();

  const minDate = today();
  const [from, setFrom] = useState(addDays(minDate, 1));
  const [to, setTo] = useState(addDays(minDate, 4));

  const isValid = !!from && !!to && from <= to && from >= minDate;

  const submit = () => {
    if (!isValid) return;
    navigate('/reserver', { state: { search: { from, to, agencyKey: agencyFilter } } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 34 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-5xl mx-auto rounded-3xl p-5 sm:p-7"
      style={{
        background: 'color-mix(in srgb, var(--color-panel) 72%, transparent)',
        border: '1px solid var(--color-line)',
        backdropFilter: 'blur(22px) saturate(150%)',
        WebkitBackdropFilter: 'blur(22px) saturate(150%)',
        boxShadow: 'var(--shadow-lift)',
      }}
    >
      <p
        className="text-[11px] font-bold uppercase tracking-[0.18em] mb-5 flex items-center gap-2"
        style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
      >
        <Search size={13} />
        {lang === 'fr' ? 'Trouvez un véhicule disponible' : 'ابحث عن سيارة متاحة'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto] gap-4 items-end">
        <div>
          <label className="label" htmlFor="search-agency">
            <Building2 size={12} style={{ color: 'var(--color-iris)' }} />
            {lang === 'fr' ? 'Agence' : 'الوكالة'}
          </label>
          <select
            id="search-agency"
            className="field"
            value={agencyFilter}
            onChange={e => setAgencyFilter(e.target.value)}
          >
            <option value="">{lang === 'fr' ? 'Toutes les agences' : 'كل الوكالات'}</option>
            {agencies.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}{a.city ? ` — ${a.city}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="search-from">
            <CalendarDays size={12} style={{ color: 'var(--color-iris)' }} />
            {lang === 'fr' ? 'Départ' : 'المغادرة'}
          </label>
          <input
            id="search-from"
            type="date"
            className="field"
            value={from}
            min={minDate}
            onChange={e => {
              setFrom(e.target.value);
              if (to && e.target.value > to) setTo(addDays(e.target.value, 1));
            }}
          />
        </div>

        <div>
          <label className="label" htmlFor="search-to">
            <CalendarDays size={12} style={{ color: 'var(--color-iris)' }} />
            {lang === 'fr' ? 'Retour' : 'الإرجاع'}
          </label>
          <input
            id="search-to"
            type="date"
            className="field"
            value={to}
            min={from || minDate}
            onChange={e => setTo(e.target.value)}
          />
        </div>

        <motion.button
          whileHover={isValid ? { scale: 1.03, y: -2 } : {}}
          whileTap={isValid ? { scale: 0.97 } : {}}
          onClick={submit}
          disabled={!isValid}
          className="btn-aurora h-[46px] px-7 text-sm w-full lg:w-auto"
        >
          {lang === 'fr' ? 'Rechercher' : 'بحث'} <ArrowRight size={16} />
        </motion.button>
      </div>

      <p className="text-[11px] mt-4 flex items-center gap-1.5" style={{ color: 'var(--color-faint)' }}>
        <ShieldCheck size={12} />
        {lang === 'fr'
          ? 'Disponibilité vérifiée en direct auprès de chaque agence, au moment de la recherche.'
          : 'يتم التحقق من التوفر مباشرة لدى كل وكالة.'}
      </p>
    </motion.div>
  );
};

// ─── Bandeau de chiffres ─────────────────────────────────────────────────────

const StatsBand: React.FC = () => {
  const { lang, agencies, cars, pickupPoints, specialOffers } = useApp();

  const cheapest = cars.length ? Math.min(...cars.map(c => c.priceDay)) : 0;

  const items = [
    { icon: Building2, value: `${agencies.length}`, label: { fr: 'Agences connectées', ar: 'وكالات متصلة' }, accent: 'var(--color-iris)' },
    { icon: CarIcon, value: `${cars.length}`, label: { fr: 'Véhicules en ligne', ar: 'سيارات متاحة' }, accent: 'var(--color-aqua)' },
    { icon: MapPin, value: `${pickupPoints.length}`, label: { fr: 'Points de retrait', ar: 'نقاط الاستلام' }, accent: 'var(--color-mint)' },
    { icon: Star, value: cheapest ? money(cheapest, lang) : '—', label: { fr: 'À partir de / jour', ar: 'ابتداء من / يوم' }, accent: 'var(--color-magenta)' },
  ];

  return (
    <section
      className="relative py-14 px-4 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-ink-alt)', borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)' }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: i * 0.09 }}
            className="text-center sm:text-left flex flex-col sm:flex-row items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in srgb, ${item.accent} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${item.accent} 28%, transparent)`,
              }}
            >
              <item.icon size={20} style={{ color: item.accent }} />
            </div>
            <div className="min-w-0">
              <p
                className="font-black text-2xl sm:text-3xl leading-none"
                style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
              >
                {item.value}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider mt-1.5" style={{ color: 'var(--color-muted)' }}>
                {item.label[lang]}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

// ─── Comment ça marche ───────────────────────────────────────────────────────

const HowItWorks: React.FC = () => {
  const { lang } = useApp();

  const steps = [
    {
      icon: Layers,
      title: { fr: 'Comparez toutes les flottes', ar: 'قارن كل الأساطيل' },
      text: {
        fr: "Les véhicules de chaque agence partenaire sont réunis dans une seule grille. Chaque carte porte le nom de l'enseigne à laquelle elle appartient.",
        ar: 'سيارات كل وكالة شريكة مجمعة في شبكة واحدة.',
      },
      accent: 'var(--color-iris)',
    },
    {
      icon: MapPin,
      title: { fr: 'Choisissez votre lieu de départ', ar: 'اختر مكان المغادرة' },
      text: {
        fr: "Une fois le véhicule choisi, seuls les points de retrait de SON agence vous sont proposés — celle qui vous remettra les clés.",
        ar: 'بعد اختيار السيارة، تُقترح فقط نقاط استلام وكالتها.',
      },
      accent: 'var(--color-aqua)',
    },
    {
      icon: Zap,
      title: { fr: "L'agence reçoit votre demande", ar: 'تستقبل الوكالة طلبك' },
      text: {
        fr: "Votre réservation arrive instantanément dans le logiciel de l'agence propriétaire, qui vous rappelle pour la confirmer.",
        ar: 'يصل حجزك فورا إلى برنامج الوكالة المالكة.',
      },
      accent: 'var(--color-magenta)',
    },
  ];

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: 'var(--color-ink)' }}>
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          eyebrow={lang === 'fr' ? 'Comment ça marche' : 'كيف يعمل'}
          title={lang === 'fr' ? 'Trois étapes, zéro intermédiaire' : 'ثلاث خطوات بدون وسيط'}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.6, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="ring-aurora relative rounded-2xl p-7 overflow-hidden"
              style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}
            >
              <span
                className="absolute top-5 right-6 font-black text-6xl leading-none pointer-events-none select-none"
                style={{ color: step.accent, opacity: 0.09, fontFamily: 'var(--font-display)' }}
              >
                {i + 1}
              </span>

              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{
                  background: `color-mix(in srgb, ${step.accent} 13%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${step.accent} 30%, transparent)`,
                }}
              >
                <step.icon size={21} style={{ color: step.accent }} />
              </div>

              <h3
                className="font-bold text-lg mb-2.5"
                style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
              >
                {step.title[lang]}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                {step.text[lang]}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Bandeau défilant des agences ────────────────────────────────────────────

const AgenciesBand: React.FC = () => {
  const { agencies, cars, lang } = useApp();
  if (agencies.length === 0) return null;

  // Doublé pour que l'animation boucle sans coupure (translateX -50%).
  const loop = [...agencies, ...agencies];

  return (
    <section
      className="py-14 overflow-hidden"
      style={{ background: 'var(--color-ink-alt)', borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)' }}
    >
      <p
        className="text-center text-[11px] font-bold uppercase tracking-[0.2em] mb-8"
        style={{ color: 'var(--color-faint)', fontFamily: 'var(--font-display)' }}
      >
        {lang === 'fr' ? 'Nos agences partenaires' : 'وكالاتنا الشريكة'}
      </p>

      <div className="relative">
        <div className="marquee gap-4">
          {loop.map((agency, i) => {
            const accent = agencyColor(agency.brandColor);
            const count = cars.filter(c => c.agencyKey === agency.id).length;
            return (
              <div
                key={`${agency.id}-${i}`}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl shrink-0"
                style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)', minWidth: '16rem' }}
              >
                {agency.logoUrl ? (
                  <img src={agency.logoUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white shrink-0"
                    style={{ background: accent, fontFamily: 'var(--font-display)' }}
                  >
                    {agency.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                    {agency.name}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
                    {agency.city ? `${agency.city} · ` : ''}{count} {lang === 'fr' ? 'véhicules' : 'سيارة'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fondus latéraux */}
        <div className="absolute inset-y-0 left-0 w-24 pointer-events-none" style={{ background: 'linear-gradient(to right, var(--color-ink-alt), transparent)' }} />
        <div className="absolute inset-y-0 right-0 w-24 pointer-events-none" style={{ background: 'linear-gradient(to left, var(--color-ink-alt), transparent)' }} />
      </div>
    </section>
  );
};

// ─── Appel à l'action final ──────────────────────────────────────────────────

const FinalCta: React.FC = () => {
  const { lang } = useApp();
  const navigate = useNavigate();

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: 'var(--color-ink)' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, var(--color-iris-soft), transparent 70%)' }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="relative max-w-3xl mx-auto text-center"
      >
        <h2
          className="font-black text-3xl sm:text-5xl mb-5 leading-tight"
          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
        >
          {lang === 'fr' ? 'Prêt à prendre la route ?' : 'مستعد للانطلاق؟'}
        </h2>
        <p className="text-base mb-9" style={{ color: 'var(--color-muted)' }}>
          {lang === 'fr'
            ? 'Choisissez votre véhicule, indiquez vos dates, et laissez-nous transmettre le reste.'
            : 'اختر سيارتك، حدد تواريخك، ودعنا نتكفل بالباقي.'}
        </p>
        <motion.button
          whileHover={{ scale: 1.04, y: -3 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/offres')}
          className="btn-aurora h-14 px-10 text-sm"
        >
          <CarIcon size={18} /> {lang === 'fr' ? 'Parcourir les véhicules' : 'تصفح السيارات'}
        </motion.button>
      </motion.div>
    </section>
  );
};

// ─── Titre de section réutilisable ───────────────────────────────────────────

export const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  description?: string;
}> = ({ eyebrow, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.6 }}
    className="text-center mb-12"
  >
    <p
      className="text-[11px] font-bold uppercase tracking-[0.22em] mb-3"
      style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
    >
      {eyebrow}
    </p>
    <h2
      className="font-black text-3xl sm:text-4xl lg:text-5xl leading-tight"
      style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
    >
      {title}
    </h2>
    {description && (
      <p className="text-sm sm:text-base mt-4 max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        {description}
      </p>
    )}
  </motion.div>
);
