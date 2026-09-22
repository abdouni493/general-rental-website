import React from 'react';
import { motion } from 'motion/react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { agencyColor, agencyTint, initials } from '../../utils/format';

// ============================================================================
// Briques d'interface partagées par la vitrine et l'espace admin.
// ============================================================================

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} style={{ color: 'var(--color-iris)' }} />
);

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Chargement…' }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-28">
    <div className="relative">
      <div
        className="w-14 h-14 rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-line)', borderTopColor: 'var(--color-iris)' }}
      />
      <div
        className="absolute inset-2 rounded-full border-2 animate-spin"
        style={{ borderColor: 'transparent', borderBottomColor: 'var(--color-aqua)', animationDuration: '1.4s' }}
      />
    </div>
    <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>{label}</p>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}> = ({ title, description, icon: Icon = Inbox, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center text-center gap-3 py-20 px-6"
  >
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center"
      style={{ background: 'var(--color-iris-soft)', border: '1px solid var(--color-line)' }}
    >
      <Icon size={26} style={{ color: 'var(--color-iris)' }} />
    </div>
    <h3 className="font-bold text-lg" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
      {title}
    </h3>
    {description && (
      <p className="text-sm max-w-md" style={{ color: 'var(--color-muted)' }}>{description}</p>
    )}
    {action}
  </motion.div>
);

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
    style={{
      background: 'rgba(194, 14, 26, 0.10)',
      border: '1px solid rgba(194, 14, 26, 0.30)',
    }}
    role="alert"
  >
    <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--color-coral)' }} />
    <p className="text-sm flex-1" style={{ color: 'var(--color-title)' }}>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="text-xs font-bold underline shrink-0" style={{ color: 'var(--color-coral)' }}>
        Réessayer
      </button>
    )}
  </motion.div>
);

/** Pastille identifiant l'agence propriétaire d'une voiture / d'une offre. */
export const AgencyBadge: React.FC<{
  name: string;
  color?: string | null;
  logo?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ name, color, logo, size = 'sm', className = '' }) => {
  const accent = agencyColor(color);
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs'
      } ${className}`}
      style={{
        color: accent,
        background: agencyTint(color, 0.13),
        border: `1px solid ${agencyTint(color, 0.35)}`,
        fontFamily: 'var(--font-display)',
      }}
      title={name}
    >
      {logo ? (
        <img
          src={logo}
          alt=""
          className={`${isSm ? 'w-3 h-3' : 'w-4 h-4'} rounded-full object-cover`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className={`${isSm ? 'w-3 h-3 text-[7px]' : 'w-4 h-4 text-[9px]'} rounded-full flex items-center justify-center font-black text-white`}
          style={{ background: accent }}
        >
          {initials(name)[0]}
        </span>
      )}
      <span className="truncate max-w-[9rem]">{name}</span>
    </span>
  );
};

/** Tuile de statistique de l'espace admin. */
export const StatTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  accent?: string;
  delay?: number;
}> = ({ label, value, hint, icon: Icon, accent = 'var(--color-iris)', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className="glass-strong rounded-2xl p-5 relative overflow-hidden"
  >
    <div
      className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none"
      style={{ background: accent, opacity: 0.1, filter: 'blur(28px)' }}
    />
    <div className="flex items-start justify-between gap-3 relative">
      <div className="min-w-0">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2 truncate"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
        >
          {label}
        </p>
        <p
          className="text-3xl font-black leading-none"
          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
        >
          {value}
        </p>
        {hint && <p className="text-xs mt-2" style={{ color: 'var(--color-faint)' }}>{hint}</p>}
      </div>
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)` }}
      >
        <Icon size={20} style={{ color: accent }} />
      </div>
    </div>
  </motion.div>
);

/** Modale centrée, fermée par Échap et par clic sur le voile. */
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}> = ({ open, onClose, title, subtitle, children, footer, width = 'max-w-2xl' }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(8px)' }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={`relative w-full ${width} max-h-[90vh] flex flex-col rounded-3xl overflow-hidden`}
        style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-lift)' }}
      >
        <div
          className="px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--color-line-soft)', background: 'var(--color-panel-2)' }}
        >
          <h2 className="font-black text-lg" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
            {title}
          </h2>
          {subtitle && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{subtitle}</p>}
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div
            className="px-6 py-4 flex flex-wrap items-center justify-end gap-3 shrink-0"
            style={{ borderTop: '1px solid var(--color-line-soft)', background: 'var(--color-panel-2)' }}
          >
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};

/** Interrupteur accessible utilisé dans les formulaires admin. */
export const Toggle: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 text-left w-full"
  >
    <span
      className="relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200"
      style={{ background: checked ? 'var(--color-iris)' : 'var(--color-panel-3)' }}
    >
      <motion.span
        animate={{ x: checked ? 22 : 3 }}
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
      />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-semibold" style={{ color: 'var(--color-title)' }}>{label}</span>
      {hint && <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{hint}</span>}
    </span>
  </button>
);
