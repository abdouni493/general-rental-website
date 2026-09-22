import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import {
  Menu, X, Sun, Moon, ShieldCheck, Car, Sparkles, MapPin,
  Phone, Mail, Facebook, Instagram, ArrowUpRight, Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Language } from '../../types';

// ============================================================================
// Coquille du site public : barre de navigation, contenu, pied de page.
// ============================================================================

const NAV_ITEMS: { to: string; label: Record<Language, string>; icon: React.ElementType }[] = [
  { to: '/',            label: { fr: 'Accueil',     ar: 'الرئيسية' },  icon: Zap },
  { to: '/offres',      label: { fr: 'Véhicules',   ar: 'السيارات' },  icon: Car },
  { to: '/promotions',  label: { fr: 'Promotions',  ar: 'العروض' },    icon: Sparkles },
  { to: '/agences',     label: { fr: 'Agences',     ar: 'الوكالات' },  icon: MapPin },
  { to: '/contact',     label: { fr: 'Contact',     ar: 'اتصل بنا' },  icon: Phone },
];

export const SiteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang, theme, toggleTheme, agencies } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Jauge de progression de lecture, collée sous la barre de navigation.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-ink)' }}>
      {/* ══ BARRE DE NAVIGATION ══ */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? 'color-mix(in srgb, var(--color-ink) 82%, transparent)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(150%)' : 'none',
          borderBottom: scrolled ? '1px solid var(--color-line)' : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">

            {/* ── Marque ── */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <motion.div
                whileHover={{ rotate: -8, scale: 1.06 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, var(--color-iris-dark), var(--color-iris) 50%, var(--color-aqua))',
                  boxShadow: '0 8px 24px var(--color-iris-glow)',
                }}
              >
                <Car size={21} className="text-white relative z-10" />
              </motion.div>
              <div className="hidden sm:block leading-tight">
                <p
                  className="font-black text-xl tracking-tight"
                  style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                >
                  Drive<span className="text-aurora">Hub</span>
                </p>
                <p
                  className="text-[10px] font-bold tracking-[0.18em] uppercase"
                  style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
                >
                  {lang === 'fr'
                    ? `${agencies.length || ''} agences · une seule réservation`.trim()
                    : 'كل الوكالات · حجز واحد'}
                </p>
              </div>
            </Link>

            {/* ── Liens (desktop) ── */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  {({ isActive }) => (
                    <span
                      className="relative px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-[0.1em] transition-colors duration-200 inline-block"
                      style={{
                        color: isActive ? 'var(--color-iris)' : 'var(--color-muted)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {item.label[lang]}
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-xl -z-10"
                          style={{ background: 'var(--color-iris-soft)', border: '1px solid var(--color-line)' }}
                          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                        />
                      )}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* ── Actions ── */}
            <div className="flex items-center gap-2 shrink-0">
              <IconButton
                onClick={toggleTheme}
                label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                    transition={{ duration: 0.22 }}
                    className="flex"
                  >
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                  </motion.span>
                </AnimatePresence>
              </IconButton>

              <button
                onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
                className="px-3 h-9 rounded-xl text-xs font-black transition-all duration-200 hidden sm:block"
                style={{
                  color: 'var(--color-iris)',
                  background: 'var(--color-iris-soft)',
                  border: '1px solid var(--color-line)',
                  fontFamily: 'var(--font-display)',
                }}
                aria-label={lang === 'fr' ? 'Passer en arabe' : 'التبديل إلى الفرنسية'}
              >
                {lang === 'fr' ? 'عربي' : 'FR'}
              </button>

              {/* Accès à l'espace d'administration — demandé sur la navbar. */}
              <Link
                to="/admin/login"
                className="hidden md:inline-flex items-center gap-2 h-9 px-4 rounded-xl text-xs font-bold transition-all duration-200"
                style={{
                  color: 'var(--color-title)',
                  background: 'var(--color-panel-2)',
                  border: '1px solid var(--color-line)',
                  fontFamily: 'var(--font-display)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-iris)';
                  e.currentTarget.style.color = 'var(--color-iris)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-line)';
                  e.currentTarget.style.color = 'var(--color-title)';
                }}
              >
                <ShieldCheck size={15} />
                {lang === 'fr' ? 'Admin' : 'الإدارة'}
              </Link>

              <Link to="/reserver" className="btn-aurora hidden sm:inline-flex h-9 px-5 text-xs">
                {lang === 'fr' ? 'Réserver' : 'احجز'}
              </Link>

              <button
                onClick={() => setMenuOpen(v => !v)}
                className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line)', color: 'var(--color-title)' }}
                aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Jauge de progression */}
        <motion.div
          className="h-[2px] origin-left"
          style={{
            scaleX: progress,
            background: 'linear-gradient(90deg, var(--color-iris), var(--color-aqua), var(--color-magenta))',
          }}
        />

        {/* ── Menu mobile ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden overflow-hidden"
              style={{ background: 'var(--color-ink-alt)', borderTop: '1px solid var(--color-line)' }}
            >
              <div className="px-4 py-4 space-y-1">
                {NAV_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <NavLink to={item.to} end={item.to === '/'}>
                      {({ isActive }) => (
                        <span
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold"
                          style={{
                            color: isActive ? 'var(--color-iris)' : 'var(--color-body)',
                            background: isActive ? 'var(--color-iris-soft)' : 'transparent',
                            fontFamily: 'var(--font-display)',
                          }}
                        >
                          <item.icon size={17} /> {item.label[lang]}
                        </span>
                      )}
                    </NavLink>
                  </motion.div>
                ))}

                <div className="pt-3 mt-3 flex gap-2" style={{ borderTop: '1px solid var(--color-line-soft)' }}>
                  <Link to="/admin/login" className="btn-ghost flex-1 h-11 text-xs">
                    <ShieldCheck size={15} /> {lang === 'fr' ? 'Espace admin' : 'الإدارة'}
                  </Link>
                  <Link to="/reserver" className="btn-aurora flex-1 h-11 text-xs">
                    {lang === 'fr' ? 'Réserver' : 'احجز'}
                  </Link>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
};

const IconButton: React.FC<{ onClick: () => void; label: string; children: React.ReactNode }> = ({
  onClick, label, children,
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
    style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line)', color: 'var(--color-body)' }}
    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-iris)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-body)'; }}
  >
    {children}
  </button>
);

// ─── Pied de page ────────────────────────────────────────────────────────────

const SiteFooter: React.FC = () => {
  const { lang, agencies } = useApp();
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: 'var(--color-ink-alt)', borderTop: '1px solid var(--color-line)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-iris), var(--color-aqua))' }}
              >
                <Car size={18} className="text-white" />
              </div>
              <p className="font-black text-xl" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                Drive<span className="text-aurora">Hub</span>
              </p>
            </div>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'var(--color-muted)' }}>
              {lang === 'fr'
                ? "Le portail qui réunit la flotte de plusieurs agences de location. Comparez, choisissez, réservez : votre demande part directement à l'agence propriétaire du véhicule."
                : 'البوابة التي تجمع أسطول عدة وكالات تأجير. قارن واختر واحجز: يصل طلبك مباشرة إلى الوكالة المالكة للسيارة.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {agencies.map(a => (
                <span
                  key={a.id}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{
                    color: 'var(--color-body)',
                    background: 'var(--color-panel)',
                    border: '1px solid var(--color-line)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {a.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4
              className="font-bold text-[11px] tracking-[0.18em] uppercase mb-4"
              style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
            >
              {lang === 'fr' ? 'Navigation' : 'التنقل'}
            </h4>
            <ul className="space-y-2.5">
              {NAV_ITEMS.map(item => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm inline-flex items-center gap-1.5 transition-colors"
                    style={{ color: 'var(--color-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-iris)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; }}
                  >
                    {item.label[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4
              className="font-bold text-[11px] tracking-[0.18em] uppercase mb-4"
              style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
            >
              {lang === 'fr' ? 'Accès rapide' : 'وصول سريع'}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/reserver"
                  className="text-sm inline-flex items-center gap-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {lang === 'fr' ? 'Réserver un véhicule' : 'احجز سيارة'} <ArrowUpRight size={13} />
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/login"
                  className="text-sm inline-flex items-center gap-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {lang === 'fr' ? 'Espace administration' : 'مساحة الإدارة'} <ArrowUpRight size={13} />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--color-line-soft)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-faint)' }}>
            © {year} DriveHub. {lang === 'fr' ? 'Tous droits réservés.' : 'جميع الحقوق محفوظة.'}
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full dot-live" style={{ background: 'var(--color-mint)', color: 'var(--color-mint)' }} />
            <span className="text-[11px] font-bold tracking-wider" style={{ color: 'var(--color-faint)', fontFamily: 'var(--font-display)' }}>
              {agencies.length} {lang === 'fr' ? 'agences connectées' : 'وكالات متصلة'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { NAV_ITEMS };
