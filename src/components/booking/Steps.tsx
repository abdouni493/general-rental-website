import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car as CarIcon, Search, MapPin, Clock, ShieldCheck, Check, X, Plus,
  User, Plane, FileText, Info, Building2, Sparkles, AlertTriangle, Lock,
} from 'lucide-react';

import { useBooking } from './BookingContext';
import { useApp } from '../../context/AppContext';
import { BookingCalendar } from './BookingCalendar';
import { EmptyState, Spinner, AgencyBadge } from '../ui/Primitives';
import { money, currentOfferForCar, agencyColor, agencyTint, WILAYAS, TIME_SLOTS } from '../../utils/format';
import { formatDate, daysBetween } from '../../utils/dates';
import type { Car, AgencyService, ProtectionAssurance } from '../../types';

// ============================================================================
// Les six étapes du tunnel.
// ============================================================================

const stepTransition = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const };

export const StepShell: React.FC<{
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, x: 24 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -24 }}
    transition={stepTransition}
  >
    <div className="flex items-start gap-3.5 mb-7">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-iris-soft)', border: '1px solid var(--color-line)' }}
      >
        <Icon size={19} style={{ color: 'var(--color-iris)' }} />
      </div>
      <div className="min-w-0">
        <h2
          className="font-black text-xl sm:text-2xl leading-tight"
          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-muted)' }}>{description}</p>
        )}
      </div>
    </div>
    {children}
  </motion.div>
);

// ═══════════════════ ÉTAPE 1 — VÉHICULE & DATES ═══════════════════

export const StepVehicle: React.FC = () => {
  const { lang, specialOffers } = useApp();
  const {
    car, selectCar, eligibleCars, loadingAvailability, search,
    range, setRange, departureTime, setDepartureTime, returnTime, setReturnTime,
    blockedRanges, loadingBlocked, days,
  } = useBooking();

  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? eligibleCars.filter(c => `${c.brand} ${c.model} ${c.agencyName}`.toLowerCase().includes(needle))
      : eligibleCars;
    return [...filtered].sort((a, b) => a.priceDay - b.priceDay);
  }, [eligibleCars, query]);

  return (
    <StepShell
      icon={CarIcon}
      title={lang === 'fr' ? 'Votre véhicule et vos dates' : 'سيارتك وتواريخك'}
      description={
        search
          ? lang === 'fr'
            ? `Véhicules disponibles du ${formatDate(search.from, lang)} au ${formatDate(search.to, lang)}.`
            : `السيارات المتاحة من ${search.from} إلى ${search.to}.`
          : lang === 'fr'
            ? 'Choisissez un véhicule, puis la période de location.'
            : 'اختر سيارة ثم فترة الإيجار.'
      }
    >
      {/* ── Sélecteur de véhicule ── */}
      <div className="mb-7">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="search"
            className="field pl-10"
            placeholder={lang === 'fr' ? 'Filtrer par marque, modèle ou agence…' : 'تصفية…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {loadingAvailability ? (
          <div className="flex items-center justify-center gap-2.5 py-14">
            <Spinner />
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {lang === 'fr' ? 'Vérification des disponibilités…' : 'التحقق من التوفر…'}
            </span>
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={CarIcon}
            title={lang === 'fr' ? 'Aucun véhicule disponible' : 'لا توجد سيارة متاحة'}
            description={
              lang === 'fr'
                ? 'Modifiez vos dates ou élargissez le filtre pour voir plus de véhicules.'
                : 'غيّر تواريخك أو وسّع التصفية.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[26rem] overflow-y-auto pr-1">
            {list.map((item, i) => (
              <VehicleOption
                key={`${item.agencyKey}-${item.id}`}
                car={item}
                selected={car?.id === item.id}
                index={i}
                lang={lang}
                offerPrice={currentOfferForCar(item.id, specialOffers)?.newPrice}
                onSelect={() => selectCar(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Période ── */}
      {car && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div
            className="rounded-2xl p-4 mb-5 flex items-start gap-3"
            style={{ background: agencyTint(car.agencyColor, 0.08), border: `1px solid ${agencyTint(car.agencyColor, 0.25)}` }}
          >
            <Building2 size={17} style={{ color: agencyColor(car.agencyColor) }} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-body)' }}>
              {lang === 'fr' ? (
                <>
                  Ce véhicule appartient à <strong style={{ color: agencyColor(car.agencyColor) }}>{car.agencyName}</strong>.
                  {' '}Les lieux de départ, les assurances et les services proposés aux étapes suivantes seront les siens,
                  et votre réservation lui sera transmise directement.
                </>
              ) : (
                <>هذه السيارة تعود إلى <strong style={{ color: agencyColor(car.agencyColor) }}>{car.agencyName}</strong>. سيصل حجزك إليها مباشرة.</>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-5">
            <BookingCalendar
              range={range}
              onChange={setRange}
              blocked={blockedRanges}
              lang={lang}
              loading={loadingBlocked}
            />

            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="departure-time">
                  <Clock size={12} style={{ color: 'var(--color-iris)' }} />
                  {lang === 'fr' ? 'Heure de départ' : 'ساعة المغادرة'}
                </label>
                <select id="departure-time" className="field" value={departureTime} onChange={e => setDepartureTime(e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="return-time">
                  <Clock size={12} style={{ color: 'var(--color-iris)' }} />
                  {lang === 'fr' ? 'Heure de retour' : 'ساعة الإرجاع'}
                </label>
                <select id="return-time" className="field" value={returnTime} onChange={e => setReturnTime(e.target.value)}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div
                className="rounded-2xl p-4 space-y-2.5"
                style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
              >
                <Row label={lang === 'fr' ? 'Départ' : 'المغادرة'} value={range.from ? formatDate(range.from, lang) : '—'} />
                <Row label={lang === 'fr' ? 'Retour' : 'الإرجاع'} value={range.to ? formatDate(range.to, lang) : '—'} />
                <div className="pt-2.5" style={{ borderTop: '1px solid var(--color-line-soft)' }}>
                  <Row
                    label={lang === 'fr' ? 'Durée' : 'المدة'}
                    value={days ? `${days} ${lang === 'fr' ? (days > 1 ? 'jours' : 'jour') : 'يوم'}` : '—'}
                    strong
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </StepShell>
  );
};

const VehicleOption: React.FC<{
  car: Car;
  selected: boolean;
  index: number;
  lang: 'fr' | 'ar';
  offerPrice?: number;
  onSelect: () => void;
}> = ({ car, selected, index, lang, offerPrice, onSelect }) => {
  const accent = agencyColor(car.agencyColor);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 9) * 0.035, duration: 0.3 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      aria-pressed={selected}
      className="text-left rounded-2xl overflow-hidden relative transition-colors duration-200"
      style={{
        background: selected ? 'var(--color-iris-soft)' : 'var(--color-panel-2)',
        border: `1.5px solid ${selected ? 'var(--color-iris)' : 'var(--color-line-soft)'}`,
      }}
    >
      <div className="flex gap-3 p-2.5">
        <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--color-panel-3)' }}>
          <img src={car.image} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
            {car.brand} {car.model}
          </p>
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-1 truncate max-w-full"
            style={{ color: accent, background: agencyTint(car.agencyColor, 0.13) }}
          >
            {car.agencyName}
          </span>
          <p className="font-black text-sm mt-1.5" style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}>
            {money(offerPrice ?? car.priceDay, lang)}
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-muted)' }}>
              /{lang === 'fr' ? 'j' : 'ي'}
            </span>
          </p>
        </div>
      </div>

      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ background: 'var(--color-iris)' }}
        >
          <Check size={12} strokeWidth={3} />
        </motion.span>
      )}
    </motion.button>
  );
};

// ═══════════════════ ÉTAPE 2 — LIEUX (AGENCE PROPRIÉTAIRE) ═══════════════════

export const StepPickup: React.FC = () => {
  const { lang } = useApp();
  const {
    car, availablePoints, loadingPoints,
    departurePointId, setDeparturePointId,
    differentReturn, setDifferentReturn,
    returnPointId, setReturnPointId,
  } = useBooking();

  if (!car) return null;
  const accent = agencyColor(car.agencyColor);

  return (
    <StepShell
      icon={MapPin}
      title={lang === 'fr' ? 'Lieu de départ et de retour' : 'مكان المغادرة والإرجاع'}
      description={
        lang === 'fr'
          ? `Seuls les points de retrait de ${car.agencyName} sont proposés : c'est cette agence qui détient le véhicule.`
          : `تُقترح فقط نقاط استلام ${car.agencyName}.`
      }
    >
      {/* Rappel de la règle */}
      <div
        className="rounded-2xl p-4 mb-6 flex items-start gap-3"
        style={{ background: agencyTint(car.agencyColor, 0.08), border: `1px solid ${agencyTint(car.agencyColor, 0.25)}` }}
      >
        <Lock size={16} style={{ color: accent }} className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
            {car.brand} {car.model} — {car.agencyName}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {lang === 'fr'
              ? "Une autre agence ne peut pas vous remettre ce véhicule : la liste ci-dessous se limite donc à ses adresses."
              : 'لا يمكن لوكالة أخرى تسليمك هذه السيارة.'}
          </p>
        </div>
      </div>

      {loadingPoints ? (
        <div className="flex items-center justify-center gap-2.5 py-14">
          <Spinner />
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {lang === 'fr' ? 'Chargement des lieux…' : 'تحميل المواقع…'}
          </span>
        </div>
      ) : availablePoints.length === 0 ? (
        <div
          className="rounded-2xl p-5 flex items-start gap-3"
          style={{ background: 'rgba(251, 191, 36, 0.09)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
        >
          <AlertTriangle size={18} style={{ color: 'var(--color-amber)' }} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--color-body)' }}>
            {lang === 'fr'
              ? `${car.agencyName} n'a publié aucun point de retrait pour le moment. Choisissez un véhicule d'une autre agence, ou contactez-la directement.`
              : `لم تنشر ${car.agencyName} أي نقطة استلام حاليا.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="label mb-3">
              <MapPin size={12} style={{ color: 'var(--color-iris)' }} />
              {lang === 'fr' ? 'Lieu de départ' : 'مكان المغادرة'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePoints.map((point, i) => (
                <PointOption
                  key={point.id}
                  name={point.name}
                  address={point.address}
                  city={point.city}
                  accent={accent}
                  tint={agencyTint(car.agencyColor, 0.1)}
                  selected={departurePointId === point.id}
                  index={i}
                  onSelect={() => setDeparturePointId(point.id)}
                />
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl p-4"
            style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={differentReturn}
                onChange={e => {
                  setDifferentReturn(e.target.checked);
                  if (!e.target.checked) setReturnPointId('');
                }}
                className="w-4 h-4 rounded accent-[var(--color-iris)]"
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-title)' }}>
                {lang === 'fr' ? 'Rendre le véhicule à une autre adresse' : 'إرجاع السيارة في عنوان آخر'}
              </span>
            </label>

            <AnimatePresence>
              {differentReturn && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availablePoints.map((point, i) => (
                      <PointOption
                        key={point.id}
                        name={point.name}
                        address={point.address}
                        city={point.city}
                        accent={accent}
                        tint={agencyTint(car.agencyColor, 0.1)}
                        selected={returnPointId === point.id}
                        index={i}
                        onSelect={() => setReturnPointId(point.id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </StepShell>
  );
};

const PointOption: React.FC<{
  name: string;
  address: string | null;
  city: string | null;
  accent: string;
  tint: string;
  selected: boolean;
  index: number;
  onSelect: () => void;
}> = ({ name, address, city, accent, tint, selected, index, onSelect }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, duration: 0.3 }}
    whileHover={{ y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onSelect}
    aria-pressed={selected}
    className="text-left rounded-2xl p-4 relative transition-colors duration-200"
    style={{
      background: selected ? tint : 'var(--color-panel-2)',
      border: `1.5px solid ${selected ? accent : 'var(--color-line-soft)'}`,
    }}
  >
    <div className="flex items-start gap-3 pr-6">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: selected ? accent : 'var(--color-panel-3)' }}
      >
        <MapPin size={15} style={{ color: selected ? '#fff' : 'var(--color-muted)' }} />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
          {name}
        </p>
        {(address || city) && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--color-muted)' }}>
            {[address, city].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </div>

    {selected && (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white"
        style={{ background: accent }}
      >
        <Check size={12} strokeWidth={3} />
      </motion.span>
    )}
  </motion.button>
);

// ═══════════════════ ÉTAPE 3 — ASSURANCE ═══════════════════

export const StepProtection: React.FC = () => {
  const { lang } = useApp();
  const { car, assurances, loadingAssurances, assurance, setAssurance, days } = useBooking();

  return (
    <StepShell
      icon={ShieldCheck}
      title={lang === 'fr' ? 'Protection et assurance' : 'الحماية والتأمين'}
      description={
        lang === 'fr'
          ? `Forfaits proposés par ${car?.agencyName ?? "l'agence"}. Cette étape est facultative.`
          : 'الباقات المقترحة من الوكالة. هذه الخطوة اختيارية.'
      }
    >
      {loadingAssurances ? (
        <div className="flex justify-center py-14"><Spinner size={26} /></div>
      ) : assurances.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={lang === 'fr' ? 'Aucun forfait proposé' : 'لا توجد باقات'}
          description={
            lang === 'fr'
              ? "Cette agence ne publie pas de forfait de protection en ligne. Vous pourrez en discuter au moment du retrait."
              : 'لا تنشر هذه الوكالة باقات حماية على الإنترنت.'
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Option « sans assurance » */}
          <AssuranceOption
            selected={assurance === null}
            onSelect={() => setAssurance(null)}
            title={lang === 'fr' ? 'Sans forfait de protection' : 'بدون باقة حماية'}
            priceLabel={lang === 'fr' ? 'Inclus' : 'مشمول'}
            subtitle={lang === 'fr' ? 'Les conditions standard de l’agence s’appliquent.' : 'تطبق الشروط القياسية.'}
            index={0}
          />

          {assurances.map((item, i) => (
            <AssuranceOption
              key={item.id}
              selected={assurance?.id === item.id}
              onSelect={() => setAssurance(item)}
              title={item.name}
              priceLabel={`${money(item.pricePerDay, lang)}/${lang === 'fr' ? 'jour' : 'يوم'}`}
              subtitle={days ? `${money(item.pricePerDay * days, lang)} ${lang === 'fr' ? `pour ${days} jour${days > 1 ? 's' : ''}` : ''}` : undefined}
              items={item.items}
              index={i + 1}
              lang={lang}
            />
          ))}
        </div>
      )}
    </StepShell>
  );
};

const AssuranceOption: React.FC<{
  selected: boolean;
  onSelect: () => void;
  title: string;
  priceLabel: string;
  subtitle?: string;
  items?: ProtectionAssurance['items'];
  index: number;
  lang?: 'fr' | 'ar';
}> = ({ selected, onSelect, title, priceLabel, subtitle, items, index }) => (
  <motion.button
    type="button"
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.07, duration: 0.35 }}
    whileHover={{ y: -2 }}
    onClick={onSelect}
    aria-pressed={selected}
    className="w-full text-left rounded-2xl p-5 relative transition-colors duration-200"
    style={{
      background: selected ? 'var(--color-iris-soft)' : 'var(--color-panel-2)',
      border: `1.5px solid ${selected ? 'var(--color-iris)' : 'var(--color-line-soft)'}`,
    }}
  >
    <div className="flex items-start justify-between gap-4 pr-7">
      <div className="min-w-0">
        <p className="font-bold text-base" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
          {title}
        </p>
        {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>}
      </div>
      <p
        className="font-black text-sm shrink-0 whitespace-nowrap"
        style={{ color: selected ? 'var(--color-iris)' : 'var(--color-title)', fontFamily: 'var(--font-display)' }}
      >
        {priceLabel}
      </p>
    </div>

    {items && items.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mt-3.5">
        {items.map((it, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
            style={{
              color: it.status ? 'var(--color-mint)' : 'var(--color-faint)',
              background: it.status ? 'rgba(52, 211, 153, 0.1)' : 'var(--color-panel-3)',
              textDecoration: it.status ? 'none' : 'line-through',
            }}
          >
            {it.status ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
            {it.name}
          </span>
        ))}
      </div>
    )}

    {selected && (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center text-white"
        style={{ background: 'var(--color-iris)' }}
      >
        <Check size={12} strokeWidth={3} />
      </motion.span>
    )}
  </motion.button>
);

// ═══════════════════ ÉTAPE 4 — SERVICES ═══════════════════

export const StepServices: React.FC = () => {
  const { lang } = useApp();
  const { car, services, loadingServices, selectedServices, toggleService, servicesTotal } = useBooking();

  const grouped = useMemo(() => {
    const map = new Map<string, AgencyService[]>();
    for (const s of services) {
      const list = map.get(s.category) || [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()];
  }, [services]);

  return (
    <StepShell
      icon={Plus}
      title={lang === 'fr' ? 'Services additionnels' : 'خدمات إضافية'}
      description={
        lang === 'fr'
          ? `Options proposées par ${car?.agencyName ?? "l'agence"}. Les services obligatoires sont déjà inclus.`
          : 'خيارات الوكالة. الخدمات الإلزامية مدرجة مسبقا.'
      }
    >
      {loadingServices ? (
        <div className="flex justify-center py-14"><Spinner size={26} /></div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={lang === 'fr' ? 'Aucun service additionnel' : 'لا توجد خدمات إضافية'}
          description={lang === 'fr' ? 'Cette agence ne propose pas d’options en ligne.' : 'لا تقترح هذه الوكالة خيارات.'}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, list]) => (
            <div key={category}>
              <p className="label mb-3">
                <Sparkles size={12} style={{ color: 'var(--color-iris)' }} /> {category}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {list.map((service, i) => {
                  const isSelected = selectedServices.some(s => s.id === service.id);
                  return (
                    <motion.button
                      key={service.id}
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      whileHover={service.isMandatory ? {} : { y: -2 }}
                      onClick={() => toggleService(service)}
                      disabled={service.isMandatory}
                      aria-pressed={isSelected}
                      className="text-left rounded-2xl p-4 relative transition-colors duration-200"
                      style={{
                        background: isSelected ? 'var(--color-iris-soft)' : 'var(--color-panel-2)',
                        border: `1.5px solid ${isSelected ? 'var(--color-iris)' : 'var(--color-line-soft)'}`,
                        cursor: service.isMandatory ? 'default' : 'pointer',
                        opacity: service.isMandatory ? 0.92 : 1,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 pr-6">
                        <div className="min-w-0">
                          <p className="font-bold text-sm" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                            {service.name}
                          </p>
                          {service.description && (
                            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-muted)' }}>
                              {service.description}
                            </p>
                          )}
                          {service.isMandatory && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold mt-1.5"
                              style={{ color: 'var(--color-amber)', background: 'rgba(251,191,36,0.12)' }}
                            >
                              <Lock size={8} /> {lang === 'fr' ? 'Obligatoire' : 'إلزامي'}
                            </span>
                          )}
                        </div>
                        <p
                          className="font-black text-sm shrink-0 whitespace-nowrap"
                          style={{ color: isSelected ? 'var(--color-iris)' : 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                        >
                          {money(service.price, lang)}
                        </p>
                      </div>

                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                          style={{ background: 'var(--color-iris)' }}
                        >
                          <Check size={12} strokeWidth={3} />
                        </motion.span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}

          {servicesTotal > 0 && (
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: 'var(--color-iris-soft)', border: '1px solid var(--color-line)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--color-title)' }}>
                {lang === 'fr' ? 'Total des services' : 'مجموع الخدمات'}
              </span>
              <span className="font-black text-lg" style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}>
                {money(servicesTotal, lang)}
              </span>
            </div>
          )}
        </div>
      )}
    </StepShell>
  );
};

// ═══════════════════ ÉTAPE 5 — INFORMATIONS ═══════════════════

export const StepInfo: React.FC = () => {
  const { lang } = useApp();
  const { personal, setPersonal, flight, setFlight } = useBooking();

  const set = <K extends keyof typeof personal>(key: K, value: (typeof personal)[K]) =>
    setPersonal(prev => ({ ...prev, [key]: value }));

  return (
    <StepShell
      icon={User}
      title={lang === 'fr' ? 'Vos informations' : 'معلوماتك'}
      description={
        lang === 'fr'
          ? "Transmises uniquement à l'agence qui loue le véhicule, pour établir votre contrat."
          : 'تُرسل فقط إلى الوكالة المؤجرة لإعداد عقدك.'
      }
    >
      <div className="space-y-7">
        {/* Identité */}
        <FieldGroup title={lang === 'fr' ? 'Identité' : 'الهوية'} icon={User}>
          <Field label={lang === 'fr' ? 'Prénom *' : 'الاسم *'}>
            <input className="field" value={personal.firstName} onChange={e => set('firstName', e.target.value)} autoComplete="given-name" />
          </Field>
          <Field label={lang === 'fr' ? 'Nom *' : 'اللقب *'}>
            <input className="field" value={personal.lastName} onChange={e => set('lastName', e.target.value)} autoComplete="family-name" />
          </Field>
          <Field label={lang === 'fr' ? 'Téléphone *' : 'الهاتف *'}>
            <input className="field" type="tel" value={personal.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" placeholder="0555 00 00 00" />
          </Field>
          <Field label={lang === 'fr' ? 'E-mail *' : 'البريد الإلكتروني *'}>
            <input className="field" type="email" value={personal.email} onChange={e => set('email', e.target.value)} autoComplete="email" placeholder="vous@exemple.com" />
          </Field>
          <Field label={lang === 'fr' ? 'Date de naissance' : 'تاريخ الميلاد'}>
            <input className="field" type="date" value={personal.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
          </Field>
          <Field label={lang === 'fr' ? 'Lieu de naissance' : 'مكان الميلاد'}>
            <input className="field" value={personal.placeOfBirth} onChange={e => set('placeOfBirth', e.target.value)} />
          </Field>
        </FieldGroup>

        {/* Permis */}
        <FieldGroup title={lang === 'fr' ? 'Permis de conduire' : 'رخصة السياقة'} icon={FileText}>
          <Field label={lang === 'fr' ? 'Numéro de permis *' : 'رقم الرخصة *'}>
            <input className="field" value={personal.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} />
          </Field>
          <Field label={lang === 'fr' ? 'Délivré le' : 'تاريخ الإصدار'}>
            <input className="field" type="date" value={personal.licenseDelivery} onChange={e => set('licenseDelivery', e.target.value)} />
          </Field>
          <Field label={lang === 'fr' ? 'Expire le' : 'تاريخ الانتهاء'}>
            <input className="field" type="date" value={personal.licenseExpiration} onChange={e => set('licenseExpiration', e.target.value)} />
          </Field>
          <Field label={lang === 'fr' ? 'Lieu de délivrance' : 'مكان الإصدار'}>
            <input className="field" value={personal.licenseDeliveryPlace} onChange={e => set('licenseDeliveryPlace', e.target.value)} />
          </Field>
        </FieldGroup>

        {/* Pièce complémentaire */}
        <FieldGroup title={lang === 'fr' ? 'Pièce d’identité complémentaire' : 'وثيقة هوية إضافية'} icon={FileText}>
          <Field label={lang === 'fr' ? 'Type de document' : 'نوع الوثيقة'}>
            <select className="field" value={personal.documentType} onChange={e => set('documentType', e.target.value as any)}>
              <option value="none">{lang === 'fr' ? 'Aucun' : 'لا شيء'}</option>
              <option value="id_card">{lang === 'fr' ? "Carte d'identité" : 'بطاقة التعريف'}</option>
              <option value="passport">{lang === 'fr' ? 'Passeport' : 'جواز السفر'}</option>
              <option value="residence_permit">{lang === 'fr' ? 'Titre de séjour' : 'بطاقة الإقامة'}</option>
            </select>
          </Field>
          {personal.documentType !== 'none' && (
            <>
              <Field label={lang === 'fr' ? 'Numéro' : 'الرقم'}>
                <input className="field" value={personal.documentNumber} onChange={e => set('documentNumber', e.target.value)} />
              </Field>
              <Field label={lang === 'fr' ? 'Délivré le' : 'تاريخ الإصدار'}>
                <input className="field" type="date" value={personal.documentDelivery} onChange={e => set('documentDelivery', e.target.value)} />
              </Field>
              <Field label={lang === 'fr' ? 'Expire le' : 'تاريخ الانتهاء'}>
                <input className="field" type="date" value={personal.documentExpiration} onChange={e => set('documentExpiration', e.target.value)} />
              </Field>
            </>
          )}
        </FieldGroup>

        {/* Adresse */}
        <FieldGroup title={lang === 'fr' ? 'Adresse' : 'العنوان'} icon={MapPin}>
          <Field label={lang === 'fr' ? 'Wilaya *' : 'الولاية *'}>
            <select className="field" value={personal.wilaya} onChange={e => set('wilaya', e.target.value)}>
              {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
          <Field label={lang === 'fr' ? 'Adresse complète' : 'العنوان الكامل'} wide>
            <input className="field" value={personal.completeAddress} onChange={e => set('completeAddress', e.target.value)} autoComplete="street-address" />
          </Field>
        </FieldGroup>

        {/* Vol */}
        <FieldGroup
          title={lang === 'fr' ? 'Arrivée par avion (facultatif)' : 'الوصول بالطائرة (اختياري)'}
          icon={Plane}
          hint={
            lang === 'fr'
              ? "Si vous atterrissez le jour du retrait, l'agence adapte l'heure de remise à votre vol."
              : 'إذا كنت تصل يوم الاستلام، تكيّف الوكالة ساعة التسليم مع رحلتك.'
          }
        >
          <Field label={lang === 'fr' ? 'N° de vol' : 'رقم الرحلة'}>
            <input className="field" value={flight.number} onChange={e => setFlight(p => ({ ...p, number: e.target.value }))} placeholder="AH 1234" />
          </Field>
          <Field label={lang === 'fr' ? 'Date du vol' : 'تاريخ الرحلة'}>
            <input className="field" type="date" value={flight.date} onChange={e => setFlight(p => ({ ...p, date: e.target.value }))} />
          </Field>
          <Field label={lang === 'fr' ? "Heure d'atterrissage" : 'ساعة الهبوط'}>
            <input className="field" type="time" value={flight.time} onChange={e => setFlight(p => ({ ...p, time: e.target.value }))} />
          </Field>
        </FieldGroup>
      </div>
    </StepShell>
  );
};

const FieldGroup: React.FC<{
  title: string;
  icon: React.ElementType;
  hint?: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, hint, children }) => (
  <div>
    <p className="label mb-1">
      <Icon size={12} style={{ color: 'var(--color-iris)' }} /> {title}
    </p>
    {hint && <p className="text-[11px] mb-3" style={{ color: 'var(--color-faint)' }}>{hint}</p>}
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${hint ? '' : 'mt-3'}`}>{children}</div>
  </div>
);

const Field: React.FC<{ label: string; wide?: boolean; children: React.ReactNode }> = ({ label, wide, children }) => (
  <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>{label}</span>
    {children}
  </label>
);

// ═══════════════════ ÉTAPE 6 — RÉCAPITULATIF ═══════════════════

export const StepRecap: React.FC = () => {
  const { lang } = useApp();
  const {
    car, agency, range, departureTime, returnTime,
    departurePoint, returnPoint, differentReturn,
    assurance, selectedServices, personal, flight,
    notes, setNotes, days, pricePerDay, basePrice,
    offerDiscount, servicesTotal, assuranceTotal, total,
  } = useBooking();

  if (!car || !agency) return null;
  const accent = agencyColor(car.agencyColor);

  return (
    <StepShell
      icon={FileText}
      title={lang === 'fr' ? 'Récapitulatif' : 'الملخص'}
      description={
        lang === 'fr'
          ? `Vérifiez avant d'envoyer votre demande à ${agency.name}.`
          : `تحقق قبل إرسال طلبك إلى ${agency.name}.`
      }
    >
      <div className="space-y-5">
        {/* Véhicule */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-panel-2)', border: `1px solid ${agencyTint(car.agencyColor, 0.3)}` }}
        >
          <div className="flex gap-4 p-4">
            <div className="w-28 h-20 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--color-panel-3)' }}>
              <img src={car.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0 flex-1">
              <AgencyBadge name={car.agencyName} color={car.agencyColor} logo={car.agencyLogo} />
              <p className="font-black text-lg mt-1.5 truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                {car.brand} {car.model}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                {car.energy} · {car.transmission} · {car.seats} {lang === 'fr' ? 'places' : 'مقاعد'}
              </p>
            </div>
          </div>
        </div>

        {/* Détails */}
        <SummaryBlock title={lang === 'fr' ? 'Location' : 'الإيجار'}>
          <Row label={lang === 'fr' ? 'Départ' : 'المغادرة'} value={`${range.from ? formatDate(range.from, lang) : '—'} · ${departureTime}`} />
          <Row label={lang === 'fr' ? 'Retour' : 'الإرجاع'} value={`${range.to ? formatDate(range.to, lang) : '—'} · ${returnTime}`} />
          <Row label={lang === 'fr' ? 'Durée' : 'المدة'} value={`${days} ${lang === 'fr' ? (days > 1 ? 'jours' : 'jour') : 'يوم'}`} />
          <Row
            label={lang === 'fr' ? 'Lieu de départ' : 'مكان المغادرة'}
            value={departurePoint ? `${departurePoint.name}${departurePoint.city ? ` · ${departurePoint.city}` : ''}` : '—'}
          />
          {differentReturn && (
            <Row
              label={lang === 'fr' ? 'Lieu de retour' : 'مكان الإرجاع'}
              value={returnPoint ? `${returnPoint.name}${returnPoint.city ? ` · ${returnPoint.city}` : ''}` : '—'}
            />
          )}
        </SummaryBlock>

        <SummaryBlock title={lang === 'fr' ? 'Conducteur' : 'السائق'}>
          <Row label={lang === 'fr' ? 'Nom' : 'الاسم'} value={`${personal.firstName} ${personal.lastName}`.trim() || '—'} />
          <Row label={lang === 'fr' ? 'Téléphone' : 'الهاتف'} value={personal.phone || '—'} />
          <Row label="E-mail" value={personal.email || '—'} />
          <Row label={lang === 'fr' ? 'Permis' : 'الرخصة'} value={personal.licenseNumber || '—'} />
          {flight.number && (
            <Row label={lang === 'fr' ? 'Vol' : 'الرحلة'} value={`${flight.number} ${flight.date} ${flight.time}`.trim()} />
          )}
        </SummaryBlock>

        {/* Prix */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--color-iris-soft)', border: '1px solid var(--color-line)' }}
        >
          <p className="label mb-4">{lang === 'fr' ? 'Détail du prix' : 'تفاصيل السعر'}</p>

          <div className="space-y-2.5">
            <Row
              label={`${money(car.priceDay, lang)} × ${days} ${lang === 'fr' ? (days > 1 ? 'jours' : 'jour') : 'يوم'}`}
              value={money(basePrice, lang)}
            />
            {offerDiscount > 0 && (
              <Row
                label={lang === 'fr' ? 'Remise promotion' : 'خصم العرض'}
                value={`− ${money(offerDiscount, lang)}`}
                accent="var(--color-magenta)"
              />
            )}
            {assurance && (
              <Row
                label={`${assurance.name} (${money(assurance.pricePerDay, lang)}/${lang === 'fr' ? 'j' : 'ي'})`}
                value={money(assuranceTotal, lang)}
              />
            )}
            {selectedServices.map(s => (
              <Row key={s.id} label={s.name} value={money(s.price, lang)} />
            ))}
          </div>

          <div className="flex items-end justify-between gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--color-line)' }}>
            <span className="font-bold text-sm" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
              {lang === 'fr' ? 'Total à régler à l’agence' : 'المجموع المستحق للوكالة'}
            </span>
            <span className="font-black text-2xl" style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}>
              {money(total, lang)}
            </span>
          </div>

          <p className="text-[11px] mt-3 flex items-start gap-1.5" style={{ color: 'var(--color-muted)' }}>
            <Info size={12} className="shrink-0 mt-0.5" />
            {lang === 'fr'
              ? `Caution de ${money(car.deposit, lang)} à déposer au retrait, restituée au retour du véhicule. Aucun paiement n'est demandé sur ce site.`
              : `ضمان ${money(car.deposit, lang)} عند الاستلام. لا يُطلب أي دفع على هذا الموقع.`}
          </p>
        </div>

        {/* Message */}
        <div>
          <label className="label" htmlFor="booking-notes">
            <FileText size={12} style={{ color: 'var(--color-iris)' }} />
            {lang === 'fr' ? "Message pour l'agence (facultatif)" : 'رسالة للوكالة (اختياري)'}
          </label>
          <textarea
            id="booking-notes"
            className="field min-h-[110px] resize-y"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={
              lang === 'fr'
                ? 'Siège enfant, conducteur supplémentaire, horaire particulier…'
                : 'مقعد طفل، سائق إضافي، توقيت خاص…'
            }
            maxLength={500}
          />
          <p className="text-[11px] mt-1.5 text-right" style={{ color: 'var(--color-faint)' }}>
            {notes.length}/500
          </p>
        </div>
      </div>
    </StepShell>
  );
};

const SummaryBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl p-5" style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}>
    <p className="label mb-3.5">{title}</p>
    <div className="space-y-2.5">{children}</div>
  </div>
);

export const Row: React.FC<{
  label: string;
  value: string;
  strong?: boolean;
  accent?: string;
}> = ({ label, value, strong, accent }) => (
  <div className="flex items-start justify-between gap-4 text-sm">
    <span className="min-w-0 flex-1" style={{ color: 'var(--color-muted)' }}>{label}</span>
    <span
      className={`text-right shrink-0 ${strong ? 'font-black' : 'font-semibold'}`}
      style={{ color: accent || 'var(--color-title)', fontFamily: strong ? 'var(--font-display)' : undefined }}
    >
      {value}
    </span>
  </div>
);
