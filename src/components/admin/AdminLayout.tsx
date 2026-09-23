import React, { useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Building2, BarChart3, LogOut, ExternalLink,
  Menu, X, Sun, Moon, ChevronRight, Settings,
} from 'lucide-react';

import { useAdminAuth } from './AdminAuthContext';
import { PageLoader } from '../ui/Primitives';
import { initials } from '../../utils/format';
import { BrandLogo, BrandName } from '../ui/BrandMark';

// ============================================================================
// Coquille de l'espace d'administration : barre latérale + contenu.
// La barre latérale porte les trois écrans demandés (tableau de bord, agences
// connectées, statistiques) ainsi que les deux actions permanentes :
// ouvrir le site public dans un nouvel onglet, et se déconnecter.
// ============================================================================

const NAV = [
  { to: '/admin', end: true, label: 'Tableau de bord', icon: LayoutDashboard, hint: 'Vue d’ensemble' },
  { to: '/admin/agences', end: false, label: 'Agences connectées', icon: Building2, hint: 'Connexions partenaires' },
  { to: '/admin/statistiques', end: false, label: 'Statistiques', icon: BarChart3, hint: 'Réservations du portail' },
  { to: '/admin/parametres', end: false, label: 'Paramètres', icon: Settings, hint: 'Nom, logo, landing, images' },
];

const THEME_KEY = 'drivehub-theme-admin';

export const AdminLayout: React.FC = () => {
  const { user, isLoading, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'dark' ? 'dark' : 'light';
    } catch { return 'light'; }
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* mode privé */ }
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.style.colorScheme = next;
      return next;
    });
  };

  React.useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-ink)' }}>
        <PageLoader label="Vérification de la session…" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Marque */}
      <div className="px-5 py-6" style={{ borderBottom: '1px solid var(--color-line-soft)' }}>
        <div className="flex items-center gap-3">
          <BrandLogo background="linear-gradient(135deg, var(--color-iris), var(--color-aqua))" className="rounded-xl" />
          <div className="min-w-0">
            <p className="font-black text-base leading-tight" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
              <BrandName />
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
              Administration
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {({ isActive }) => (
              <motion.span
                whileHover={{ x: 3 }}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl transition-colors duration-200 relative"
                style={{
                  color: isActive ? 'var(--color-iris)' : 'var(--color-body)',
                  background: isActive ? 'var(--color-iris-soft)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--color-line)' : 'transparent'}`,
                }}
              >
                <item.icon size={17} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    {item.label}
                  </span>
                  <span className="block text-[10px]" style={{ color: 'var(--color-faint)' }}>{item.hint}</span>
                </span>
                {isActive && <ChevronRight size={14} className="shrink-0" />}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Actions permanentes */}
      <div className="px-3 py-4 space-y-2" style={{ borderTop: '1px solid var(--color-line-soft)' }}>
        {/* Ouvrir le site public dans un nouvel onglet */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200"
          style={{
            color: 'var(--color-aqua)',
            background: 'var(--color-aqua-soft)',
            border: '1px solid var(--color-line-soft)',
            fontFamily: 'var(--font-display)',
          }}
        >
          <ExternalLink size={16} className="shrink-0" />
          <span className="flex-1 text-left">Voir le site public</span>
        </a>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200"
          style={{ color: 'var(--color-body)', background: 'transparent', border: '1px solid var(--color-line-soft)', fontFamily: 'var(--font-display)' }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span className="flex-1 text-left">{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200"
          style={{ color: 'var(--color-coral)', background: 'rgba(194,14,26,0.08)', border: '1px solid rgba(194,14,26,0.2)', fontFamily: 'var(--font-display)' }}
        >
          <LogOut size={16} className="shrink-0" />
          <span className="flex-1 text-left">Se déconnecter</span>
        </button>

        {/* Compte connecté */}
        <div
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl mt-3"
          style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-iris), var(--color-iris-dark))', fontFamily: 'var(--font-display)' }}
          >
            {initials(user.username || user.email)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--color-title)' }}>
              {user.username || 'Administrateur'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'var(--color-muted)' }}>{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-ink)' }}>
      {/* Barre latérale (desktop) */}
      <aside
        className="hidden lg:flex w-72 shrink-0 flex-col fixed inset-y-0 left-0 z-40"
        style={{ background: 'var(--color-panel)', borderRight: '1px solid var(--color-line)' }}
      >
        {sidebar}
      </aside>

      {/* Barre latérale (mobile) */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 flex flex-col"
              style={{ background: 'var(--color-panel)', borderRight: '1px solid var(--color-line)' }}
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Contenu */}
      <div className="flex-1 lg:ml-72 min-w-0">
        {/* Barre supérieure mobile */}
        <div
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16"
          style={{ background: 'var(--color-panel)', borderBottom: '1px solid var(--color-line)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line)', color: 'var(--color-title)' }}
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>

          <p className="font-black text-base" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
            <BrandName />
          </p>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-aqua-soft)', border: '1px solid var(--color-line)', color: 'var(--color-aqua)' }}
            aria-label="Voir le site public"
          >
            <ExternalLink size={17} />
          </a>
        </div>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
