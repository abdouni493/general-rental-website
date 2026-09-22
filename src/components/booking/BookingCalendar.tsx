import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import type { BlockedRange, DateRange, Language } from '../../types';
import { buildMonthGrid, fromYmd, MONTH_LABELS, WEEKDAY_LABELS, today, rangesOverlap } from '../../utils/dates';

// ============================================================================
// Calendrier de sélection de période
// ----------------------------------------------------------------------------
// Les dates déjà prises par l'agence sont grisées et non cliquables, et une
// sélection ne peut pas enjamber une période bloquée : on éviterait sinon de
// proposer au client des dates que la RPC de l'agence refuserait au dernier
// moment.
// ============================================================================

export const BookingCalendar: React.FC<{
  range: DateRange;
  onChange: (range: DateRange) => void;
  blocked: BlockedRange[];
  lang: Language;
  loading?: boolean;
}> = ({ range, onChange, blocked, lang, loading = false }) => {
  const minDate = today();
  const [cursor, setCursor] = useState(() => {
    const base = range.from ? fromYmd(range.from) : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const blockedDays = useMemo(() => {
    const set = new Set<string>();
    for (const r of blocked) {
      let d = fromYmd(r.from);
      const end = fromYmd(r.to);
      let guard = 0;
      while (d <= end && guard < 400) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        set.add(`${y}-${m}-${day}`);
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12);
        guard++;
      }
    }
    return set;
  }, [blocked]);

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const shift = (delta: number) => {
    setCursor(prev => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  /** Une période candidate ne doit croiser aucune réservation existante. */
  const isSelectableRange = (from: string, to: string) =>
    !blocked.some(b => rangesOverlap(from, to, b.from, b.to));

  const pick = (ymd: string) => {
    if (ymd < minDate || blockedDays.has(ymd)) return;

    // Pas encore de début, ou période déjà complète → on redémarre.
    if (!range.from || (range.from && range.to)) {
      onChange({ from: ymd, to: undefined });
      return;
    }
    // Un clic avant le début redéfinit le début.
    if (ymd < range.from) {
      onChange({ from: ymd, to: undefined });
      return;
    }
    if (!isSelectableRange(range.from, ymd)) {
      // La plage traverse une indisponibilité : on repart de ce jour.
      onChange({ from: ymd, to: undefined });
      return;
    }
    onChange({ from: range.from, to: ymd });
  };

  const inRange = (ymd: string) =>
    !!range.from && !!range.to && ymd > range.from && ymd < range.to;

  const isEdge = (ymd: string) => ymd === range.from || ymd === range.to;

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 select-none"
      style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line)' }}
    >
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line-soft)', color: 'var(--color-body)' }}
          aria-label={lang === 'fr' ? 'Mois précédent' : 'الشهر السابق'}
        >
          <ChevronLeft size={17} />
        </button>

        <p className="font-black text-sm" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
          {MONTH_LABELS[lang][cursor.month]} {cursor.year}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line-soft)', color: 'var(--color-body)' }}
          aria-label={lang === 'fr' ? 'Mois suivant' : 'الشهر التالي'}
        >
          <ChevronRight size={17} />
        </button>
      </div>

      {/* Jours de la semaine */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS[lang].map(d => (
          <div
            key={d}
            className="text-center text-[10px] font-bold uppercase tracking-wider py-1"
            style={{ color: 'var(--color-faint)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((ymd, i) => {
          if (!ymd) return <div key={`empty-${i}`} />;

          const isPast = ymd < minDate;
          const isBlocked = blockedDays.has(ymd);
          const disabled = isPast || isBlocked;
          const edge = isEdge(ymd);
          const between = inRange(ymd);

          return (
            <motion.button
              key={ymd}
              type="button"
              onClick={() => pick(ymd)}
              disabled={disabled}
              whileHover={disabled ? {} : { scale: 1.08 }}
              whileTap={disabled ? {} : { scale: 0.92 }}
              className="aspect-square rounded-lg text-xs font-bold flex items-center justify-center relative transition-colors duration-150"
              style={{
                color: edge
                  ? '#fff'
                  : disabled
                    ? 'var(--color-faint)'
                    : between
                      ? 'var(--color-iris)'
                      : 'var(--color-body)',
                background: edge
                  ? 'linear-gradient(135deg, var(--color-iris), var(--color-iris-dark))'
                  : between
                    ? 'var(--color-iris-soft)'
                    : 'transparent',
                border: `1px solid ${edge ? 'transparent' : between ? 'var(--color-line)' : 'transparent'}`,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: isPast ? 0.3 : 1,
                textDecoration: isBlocked ? 'line-through' : 'none',
              }}
              aria-label={ymd}
              aria-pressed={edge}
            >
              {Number(ymd.slice(8, 10))}
              {isBlocked && !isPast && (
                <span
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: 'var(--color-coral)' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--color-line-soft)' }}>
        <Legend color="var(--color-iris)" label={lang === 'fr' ? 'Sélection' : 'الاختيار'} />
        <Legend color="var(--color-coral)" label={lang === 'fr' ? 'Déjà réservé' : 'محجوز'} />
        {loading && (
          <span className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
            <Circle size={8} className="animate-pulse" style={{ color: 'var(--color-aqua)' }} />
            {lang === 'fr' ? 'Vérification du planning…' : 'التحقق من الجدول…'}
          </span>
        )}
      </div>
    </div>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--color-muted)' }}>
    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
    {label}
  </span>
);
