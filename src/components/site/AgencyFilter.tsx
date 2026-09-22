import React from 'react';
import { motion } from 'motion/react';
import { Building2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { agencyColor, agencyTint, initials } from '../../utils/format';

// ============================================================================
// Filtre par agence — présent sur le landing ET sur la page Véhicules.
// Le choix vit dans AppContext : basculer d'une page à l'autre le conserve.
// ============================================================================

export const AgencyFilter: React.FC<{
  /** `compact` pour le landing (pastilles), `full` pour la page Véhicules. */
  variant?: 'compact' | 'full';
  className?: string;
}> = ({ variant = 'full', className = '' }) => {
  const { agencies, cars, agencyFilter, setAgencyFilter, lang } = useApp();

  if (agencies.length <= 1) return null;

  const countFor = (key: string) => cars.filter(c => c.agencyKey === key).length;

  const options = [
    {
      key: '',
      name: lang === 'fr' ? 'Toutes les agences' : 'كل الوكالات',
      color: null as string | null,
      logo: null as string | null,
      count: cars.length,
    },
    ...agencies.map(a => ({
      key: a.id,
      name: a.name,
      color: a.brandColor,
      logo: a.logoUrl,
      count: countFor(a.id),
    })),
  ];

  return (
    <div className={className}>
      {variant === 'full' && (
        <p
          className="text-[11px] font-bold uppercase tracking-[0.16em] mb-3 flex items-center gap-2"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
        >
          <Building2 size={13} style={{ color: 'var(--color-iris)' }} />
          {lang === 'fr' ? 'Filtrer par agence' : 'تصفية حسب الوكالة'}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option, i) => {
          const isActive = agencyFilter === option.key;
          const accent = option.key ? agencyColor(option.color) : 'var(--color-iris)';

          return (
            <motion.button
              key={option.key || 'all'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setAgencyFilter(option.key)}
              aria-pressed={isActive}
              className="relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors duration-200"
              style={{
                color: isActive ? accent : 'var(--color-body)',
                background: isActive ? agencyTint(option.color, 0.14) : 'var(--color-panel-2)',
                border: `1px solid ${isActive ? agencyTint(option.color, 0.45) : 'var(--color-line-soft)'}`,
                fontFamily: 'var(--font-display)',
              }}
            >
              {option.key ? (
                option.logo ? (
                  <img src={option.logo} alt="" className="w-5 h-5 rounded-md object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white shrink-0"
                    style={{ background: accent }}
                  >
                    {initials(option.name)}
                  </span>
                )
              ) : (
                <Building2 size={14} />
              )}

              <span className="truncate max-w-[11rem]">{option.name}</span>

              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums"
                style={{
                  color: isActive ? accent : 'var(--color-muted)',
                  background: isActive ? 'transparent' : 'var(--color-panel-3)',
                  border: isActive ? `1px solid ${agencyTint(option.color, 0.4)}` : '1px solid transparent',
                }}
              >
                {option.count}
              </span>

              {isActive && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: accent }}
                >
                  <Check size={10} strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
