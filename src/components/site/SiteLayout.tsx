import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import {
  Menu, X, Sun, Moon, ShieldCheck, Car, Sparkles, MapPin,
  Phone, Mail, Facebook, Instagram, ArrowUpRight, Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { BrandLogo, BrandName } from '../ui/BrandMark';
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
  const { settings } = useSiteSettings();
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
      {/* Chez Avis la barre est une bande pleine et opaque dès le premier pixel :
          seule son ombre apparaît au défilement. */}
      <header
        className="sticky top-0 z-50 transition-shadow duration-250"
        style={{
          background: 'var(--color-panel)',
          borderBottom: '1px solid var(--color-line)',
          boxShadow: scrolled ? 'var(--shadow-panel)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px] gap-4">

            {/* ── Marque ── */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="relative overflow-hidden"
              >
                <BrandLogo background="var(--color-iris)" iconSize={20} />
              </motion.div>
              <div className="hidden sm:block leading-tight">
                <p className="avis-headline text-2xl" style={{ color: 'var(--color-title)' }}>
                  <BrandName />
                </p>
                <p
                  className="text-[9px] font-bold tracking-[0.14em] uppercase"
                  style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
                >
                  {settings.tagline[lang]}
                </p>
              </div>
            </Link>

            {/* ── Liens (desktop) ── */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  {({ isActive }) => (
                    <span
                      className="relative px-4 py-6 text-[13px] font-semibold transition-colors duration-250 inline-block"
                      style={{
                        color: isActive ? 'var(--color-iris)' : 'var(--color-title)',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      {item.label[lang]}
                      {isActive && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute left-2 right-2 bottom-0 h-[3px]"
                          style={{ background: 'var(--color-iris)' }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
                className="px-3 h-9 text-xs font-extrabold uppercase transition-colors duration-250 hidden sm:block"
                style={{
                  color: 'var(--color-title)',
                  background: 'transparent',
                  border: '1px solid var(--color-line)',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-display)',
                }}
                aria-label={lang === 'fr' ? 'Passer en arabe' : 'التبديل إلى الفرنسية'}
              >
                {lang === 'fr' ? 'عربي' : 'FR'}
              </button>

              {/* Accès à l'espace d'administration — demandé sur la navbar. */}
              <Link
                to="/admin/login"
                className="hidden md:inline-flex items-center gap-2 h-9 px-4 text-xs font-bold transition-colors duration-250"
                style={{
                  color: 'var(--color-title)',
                  background: 'transparent',
                  border: '1px solid var(--color-line)',
                  borderRadius: '2px',
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

              <Link to="/reserver" className="btn-aurora hidden sm:inline-flex h-9 px-6 text-xs uppercase tracking-[0.04em]">
                {lang === 'fr' ? 'Réserver' : 'احجز'}
              </Link>

              <button
                onClick={() => setMenuOpen(v => !v)}
                className="lg:hidden w-9 h-9 flex items-center justify-center"
                style={{ background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-title)' }}
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
            background: 'var(--color-iris)',
          }}
        />

        {/* ── Menu mobile ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
                          className="flex items-center gap-3 px-4 py-3 text-sm font-bold"
                          style={{
                            color: isActive ? 'var(--color-iris)' : 'var(--color-title)',
                            background: isActive ? 'var(--color-iris-soft)' : 'transparent',
                            borderLeft: isActive ? '4px solid var(--color-iris)' : '4px solid transparent',
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
    className="w-9 h-9 flex items-center justify-center transition-colors duration-250"
    style={{ background: 'transparent', border: '1px solid var(--color-line)', color: 'var(--color-title)' }}
    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-iris)'; }}
    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-title)'; }}
  >
    {children}
  </button>
);

// ─── Pied de page ────────────────────────────────────────────────────────────

const SiteFooter: React.FC = () => {
  const { lang, agencies } = useApp();
  const { settings } = useSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#0D0D0B', color: 'rgba(255,255,255,0.72)', borderTop: '4px solid #D4002A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <BrandLogo background="#D4002A" />
              <p className="avis-headline text-2xl text-white">
                <BrandName accentColor="#FF4D6D" />
              </p>
            </div>
            <p className="text-sm leading-relaxed max-w-md" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {settings.footerDescription[lang]}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {agencies.map(a => (
                <span
                  key={a.id}
                  className="px-3 py-1.5 text-[11px] font-bold"
                  style={{
                    color: '#FFFFFF',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.18)',
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
              className="font-extrabold text-[11px] tracking-[0.16em] uppercase mb-4 pb-2"
              style={{
                color: '#FFFFFF',
                fontFamily: 'var(--font-display)',
                borderBottom: '2px solid #D4002A',
                display: 'inline-block',
              }}
            >
              {lang === 'fr' ? 'Navigation' : 'التنقل'}
            </h4>
            <ul className="space-y-2.5">
              {NAV_ITEMS.map(item => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm inline-flex items-center gap-1.5 transition-colors duration-250"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#FF4D6D'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                  >
                    {item.label[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4
              className="font-extrabold text-[11px] tracking-[0.16em] uppercase mb-4 pb-2"
              style={{
                color: '#FFFFFF',
                fontFamily: 'var(--font-display)',
                borderBottom: '2px solid #D4002A',
                display: 'inline-block',
              }}
            >
              {lang === 'fr' ? 'Accès rapide' : 'وصول سريع'}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  to="/reserver"
                  className="avis-arrow text-sm inline-flex items-center gap-1.5 font-normal"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  {lang === 'fr' ? 'Réserver un véhicule' : 'احجز سيارة'} <ArrowUpRight size={13} />
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/login"
                  className="avis-arrow text-sm inline-flex items-center gap-1.5 font-normal"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  {lang === 'fr' ? 'Espace administration' : 'مساحة الإدارة'} <ArrowUpRight size={13} />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.14)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
            © {year} {settings.siteName}{settings.siteNameAccent}. {lang === 'fr' ? 'Tous droits réservés.' : 'جميع الحقوق محفوظة.'}
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full dot-live" style={{ background: '#5CB874', color: '#5CB874' }} />
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-display)' }}>
              {agencies.length} {lang === 'fr' ? 'agences connectées' : 'وكالات متصلة'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { NAV_ITEMS };
