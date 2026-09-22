import React, { useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, Send, Loader2, PartyPopper,
  Phone, Home, CalendarCheck, Building2, AlertTriangle, CarFront,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';
import { BookingProvider, useBooking, STEP_COUNT } from './BookingContext';
import { StepVehicle, StepPickup, StepProtection, StepServices, StepInfo, StepRecap, Row } from './Steps';
import { PageLoader, ErrorBanner, AgencyBadge } from '../ui/Primitives';
import { money, agencyColor, agencyTint } from '../../utils/format';
import { formatDate } from '../../utils/dates';
import type { SearchCriteria } from '../../types';

// ============================================================================
// Tunnel de réservation — page complète.
// L'état arrive par `location.state` : soit une voiture précise (clic sur
// « Réserver »), soit une recherche par dates venue du landing.
// ============================================================================

export const BookingPage: React.FC = () => {
  const location = useLocation();
  const { cars, isLoading, isSyncing } = useApp();

  const state = (location.state || {}) as {
    carId?: string;
    agencyKey?: string;
    search?: SearchCriteria;
  };

  const initialCar = useMemo(
    () => (state.carId ? cars.find(c => c.id === state.carId && c.agencyKey === state.agencyKey) || null : null),
    [cars, state.carId, state.agencyKey],
  );

  // On attend la flotte : démarrer sans elle afficherait un tunnel vide.
  // Quand l'utilisateur arrive avec un véhicule précis (clic sur « Réserver »),
  // on patiente aussi tant que son agence n'a pas répondu — le chargement est
  // progressif, et abandonner trop tôt afficherait « véhicule introuvable ».
  const waitingForTargetCar = !!state.carId && !initialCar && isSyncing;

  if (isLoading || waitingForTargetCar) {
    return (
      <div className="min-h-screen pt-32" style={{ background: 'var(--color-ink)' }}>
        <PageLoader label="Chargement des véhicules disponibles…" />
      </div>
    );
  }

  return (
    <BookingProvider initialCar={initialCar} initialSearch={state.search || null}>
      <BookingShell />
    </BookingProvider>
  );
};

// ─── Coquille ────────────────────────────────────────────────────────────────

const BookingShell: React.FC = () => {
  const { lang } = useApp();
  const { result } = useBooking();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8"
      style={{ background: 'var(--color-ink)' }}
    >
      <div className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {result ? <SuccessScreen key="success" /> : <WizardBody key="wizard" />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ─── Corps du tunnel ─────────────────────────────────────────────────────────

const WizardBody: React.FC = () => {
  const { lang } = useApp();
  const {
    step, goToStep, next, prev, isStepValid, furthestStep,
    car, agency, total, days, isSubmitting, submitError, submit,
  } = useBooking();

  const steps = [
    { n: 1, label: { fr: 'Véhicule', ar: 'السيارة' } },
    { n: 2, label: { fr: 'Lieux', ar: 'المواقع' } },
    { n: 3, label: { fr: 'Protection', ar: 'الحماية' } },
    { n: 4, label: { fr: 'Services', ar: 'الخدمات' } },
    { n: 5, label: { fr: 'Infos', ar: 'المعلومات' } },
    { n: 6, label: { fr: 'Confirmer', ar: 'التأكيد' } },
  ];

  const canContinue = isStepValid(step);
  const isLast = step === STEP_COUNT;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }}>
      {/* ── En-tête ── */}
      <div className="mb-8">
        <Link
          to="/offres"
          className="inline-flex items-center gap-1.5 text-xs font-bold mb-5 transition-colors"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-iris)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; }}
        >
          <ArrowLeft size={14} /> {lang === 'fr' ? 'Retour aux véhicules' : 'العودة إلى السيارات'}
        </Link>

        <h1
          className="font-black text-3xl sm:text-4xl leading-tight"
          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
        >
          {lang === 'fr' ? 'Votre ' : ''}
          <span className="text-aurora">{lang === 'fr' ? 'réservation' : 'حجزك'}</span>
        </h1>
      </div>

      {/* ── Fil des étapes ── */}
      <div className="glass-strong rounded-2xl p-4 mb-6 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {steps.map((s, i) => {
            const done = s.n < step;
            const current = s.n === step;
            const reachable = s.n <= furthestStep;

            return (
              <React.Fragment key={s.n}>
                <button
                  type="button"
                  onClick={() => reachable && goToStep(s.n)}
                  disabled={!reachable}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors duration-200 shrink-0"
                  style={{ cursor: reachable ? 'pointer' : 'not-allowed', opacity: reachable ? 1 : 0.45 }}
                  aria-current={current ? 'step' : undefined}
                >
                  <motion.span
                    animate={current ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={current ? { duration: 1.8, repeat: Infinity } : {}}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                    style={{
                      color: done || current ? '#fff' : 'var(--color-muted)',
                      background: done
                        ? 'var(--color-mint)'
                        : current
                          ? 'linear-gradient(135deg, var(--color-iris), var(--color-aqua))'
                          : 'var(--color-panel-3)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {done ? <Check size={13} strokeWidth={3} /> : s.n}
                  </motion.span>
                  <span
                    className="text-[11px] font-bold hidden sm:inline whitespace-nowrap"
                    style={{
                      color: current ? 'var(--color-iris)' : done ? 'var(--color-body)' : 'var(--color-faint)',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {s.label[lang]}
                  </span>
                </button>

                {i < steps.length - 1 && (
                  <span
                    className="h-px flex-1 min-w-[10px]"
                    style={{ background: s.n < step ? 'var(--color-mint)' : 'var(--color-line-soft)' }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 items-start">
        {/* ── Étape courante ── */}
        <div className="glass-strong rounded-3xl p-5 sm:p-7 order-2 lg:order-1">
          {submitError && (
            <div className="mb-6"><ErrorBanner message={submitError} /></div>
          )}

          <AnimatePresence mode="wait">
            <div key={step}>
              {step === 1 && <StepVehicle />}
              {step === 2 && <StepPickup />}
              {step === 3 && <StepProtection />}
              {step === 4 && <StepServices />}
              {step === 5 && <StepInfo />}
              {step === 6 && <StepRecap />}
            </div>
          </AnimatePresence>

          {/* ── Navigation ── */}
          <div
            className="flex items-center justify-between gap-3 mt-8 pt-6"
            style={{ borderTop: '1px solid var(--color-line-soft)' }}
          >
            <button onClick={prev} disabled={step === 1 || isSubmitting} className="btn-ghost h-12 px-5 text-xs">
              <ArrowLeft size={15} /> {lang === 'fr' ? 'Précédent' : 'السابق'}
            </button>

            {isLast ? (
              <motion.button
                whileHover={canContinue && !isSubmitting ? { scale: 1.02 } : {}}
                whileTap={canContinue && !isSubmitting ? { scale: 0.98 } : {}}
                onClick={submit}
                disabled={isSubmitting}
                className="btn-aurora h-12 px-7 text-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    {lang === 'fr' ? 'Envoi à l’agence…' : 'الإرسال…'}
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    {lang === 'fr' ? 'Confirmer la réservation' : 'تأكيد الحجز'}
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={canContinue ? { scale: 1.02 } : {}}
                whileTap={canContinue ? { scale: 0.98 } : {}}
                onClick={next}
                disabled={!canContinue}
                className="btn-aurora h-12 px-7 text-xs"
              >
                {lang === 'fr' ? 'Continuer' : 'متابعة'} <ArrowRight size={15} />
              </motion.button>
            )}
          </div>

          {!canContinue && !isLast && (
            <p className="text-[11px] mt-3 text-right flex items-center justify-end gap-1.5" style={{ color: 'var(--color-amber)' }}>
              <AlertTriangle size={11} />
              {step === 1 && (lang === 'fr' ? 'Choisissez un véhicule et une période.' : 'اختر سيارة وفترة.')}
              {step === 2 && (lang === 'fr' ? 'Choisissez un lieu de départ.' : 'اختر مكان المغادرة.')}
              {step === 5 && (lang === 'fr' ? 'Complétez les champs marqués d’un astérisque.' : 'أكمل الحقول الإلزامية.')}
            </p>
          )}
        </div>

        {/* ── Panneau latéral ── */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-28">
          <div className="glass-strong rounded-2xl p-5">
            <p className="label mb-4">{lang === 'fr' ? 'Votre sélection' : 'اختيارك'}</p>

            {car && agency ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--color-panel-3)' }}>
                    <img src={car.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                      {car.brand} {car.model}
                    </p>
                    <div className="mt-1">
                      <AgencyBadge name={car.agencyName} color={car.agencyColor} logo={car.agencyLogo} />
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 flex items-start gap-2"
                  style={{ background: agencyTint(car.agencyColor, 0.08), border: `1px solid ${agencyTint(car.agencyColor, 0.22)}` }}
                >
                  <Building2 size={13} style={{ color: agencyColor(car.agencyColor) }} className="shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug" style={{ color: 'var(--color-muted)' }}>
                    {lang === 'fr'
                      ? `Réservation transmise à ${agency.name}.`
                      : `يُرسل الحجز إلى ${agency.name}.`}
                  </p>
                </div>

                {days > 0 && (
                  <div className="space-y-2 pt-3" style={{ borderTop: '1px solid var(--color-line-soft)' }}>
                    <Row label={lang === 'fr' ? 'Durée' : 'المدة'} value={`${days} ${lang === 'fr' ? (days > 1 ? 'jours' : 'jour') : 'يوم'}`} />
                    <Row label={lang === 'fr' ? 'Total estimé' : 'المجموع'} value={money(total, lang)} strong />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CarFront size={28} style={{ color: 'var(--color-faint)' }} className="mx-auto mb-2.5" />
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {lang === 'fr' ? 'Aucun véhicule sélectionné' : 'لم تختر سيارة'}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </motion.div>
  );
};

// ─── Écran de confirmation ───────────────────────────────────────────────────

const SuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const { lang } = useApp();
  const { result, car, agency, range, departurePoint, days, reset } = useBooking();

  if (!result) return null;
  const accent = agencyColor(car?.agencyColor);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-2xl mx-auto"
    >
      <div className="glass-strong rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-iris-glow), transparent 70%)', filter: 'blur(30px)' }}
        />

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.15 }}
          className="relative w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--color-mint), var(--color-aqua))',
            boxShadow: '0 14px 40px rgba(70, 130, 84, 0.34)',
          }}
        >
          <PartyPopper size={34} className="text-white" />
        </motion.div>

        <h1
          className="font-black text-3xl mb-3 relative"
          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
        >
          {lang === 'fr' ? 'Demande envoyée !' : 'تم إرسال الطلب!'}
        </h1>

        <p className="text-sm leading-relaxed mb-7 relative" style={{ color: 'var(--color-muted)' }}>
          {lang === 'fr' ? (
            <>
              Votre réservation vient d'arriver chez{' '}
              <strong style={{ color: accent }}>{agency?.name}</strong>, l'agence qui détient ce véhicule.
              Elle vous rappelle sous peu pour la confirmer et convenir du retrait.
            </>
          ) : (
            <>
              وصل حجزك إلى <strong style={{ color: accent }}>{agency?.name}</strong>. ستتصل بك قريبا للتأكيد.
            </>
          )}
        </p>

        {/* Référence */}
        {result.reservationId && (
          <div
            className="rounded-2xl p-4 mb-5 relative"
            style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5" style={{ color: 'var(--color-muted)' }}>
              {lang === 'fr' ? 'Référence à rappeler' : 'المرجع'}
            </p>
            <p
              className="font-black text-lg tracking-wider break-all"
              style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
            >
              {result.reservationId.slice(0, 8).toUpperCase()}
            </p>
          </div>
        )}

        {/* Rappel */}
        <div
          className="rounded-2xl p-5 text-left space-y-2.5 mb-7 relative"
          style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
        >
          {car && <Row label={lang === 'fr' ? 'Véhicule' : 'السيارة'} value={`${car.brand} ${car.model}`} />}
          <Row label={lang === 'fr' ? 'Agence' : 'الوكالة'} value={agency?.name || '—'} />
          <Row
            label={lang === 'fr' ? 'Période' : 'الفترة'}
            value={range.from && range.to ? `${formatDate(range.from, lang)} → ${formatDate(range.to, lang)}` : '—'}
          />
          <Row label={lang === 'fr' ? 'Durée' : 'المدة'} value={`${days} ${lang === 'fr' ? (days > 1 ? 'jours' : 'jour') : 'يوم'}`} />
          {departurePoint && (
            <Row label={lang === 'fr' ? 'Retrait' : 'الاستلام'} value={departurePoint.name} />
          )}
          <div className="pt-2.5" style={{ borderTop: '1px solid var(--color-line-soft)' }}>
            <Row label={lang === 'fr' ? 'Total' : 'المجموع'} value={money(result.totalPrice, lang)} strong />
          </div>
        </div>

        <div
          className="rounded-xl p-3.5 flex items-start gap-2.5 mb-7 text-left relative"
          style={{ background: 'rgba(70, 130, 84, 0.08)', border: '1px solid rgba(70, 130, 84, 0.25)' }}
        >
          <Phone size={15} style={{ color: 'var(--color-mint)' }} className="shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-body)' }}>
            {lang === 'fr'
              ? "Gardez votre téléphone à portée de main : l'agence vous contacte au numéro que vous avez indiqué. Aucun paiement n'a été effectué sur ce site."
              : 'ابق هاتفك قريبا: ستتصل بك الوكالة. لم يتم أي دفع على هذا الموقع.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 relative">
          <button onClick={() => navigate('/')} className="btn-ghost flex-1 h-12 text-xs">
            <Home size={15} /> {lang === 'fr' ? "Retour à l'accueil" : 'الرئيسية'}
          </button>
          <button
            onClick={() => { reset(); navigate('/offres'); }}
            className="btn-aurora flex-1 h-12 text-xs"
          >
            <CalendarCheck size={15} /> {lang === 'fr' ? 'Nouvelle réservation' : 'حجز جديد'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
