import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';

import { AppProvider } from './context/AppContext';
import { SiteLayout } from './components/site/SiteLayout';
import { HomePage } from './components/site/HomePage';
import { FleetPage } from './components/site/FleetPage';
import { PromotionsPage } from './components/site/PromotionsPage';
import { AgenciesPage } from './components/site/AgenciesPage';
import { ContactPage } from './components/site/ContactPage';
import { BookingPage } from './components/booking/BookingPage';

import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminAgencies } from './components/admin/AdminAgencies';
import { AdminStatistics } from './components/admin/AdminStatistics';
import { AdminAuthProvider } from './components/admin/AdminAuthContext';

/** Remonte en haut à chaque changement de page (le smooth-scroll global
 *  rendrait sinon l'arrivée sur une nouvelle page désorientante). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** L'espace admin est clair par défaut, la vitrine sombre : on repose le
 *  thème à chaque bascule entre les deux mondes. */
function ThemeScope() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isAdmin = pathname.startsWith('/admin');
    const key = isAdmin ? 'drivehub-theme-admin' : 'drivehub-theme-site';
    let theme: string;
    try {
      const saved = localStorage.getItem(key);
      theme = saved === 'dark' || saved === 'light' ? saved : isAdmin ? 'light' : 'dark';
    } catch {
      theme = isAdmin ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <ThemeScope />
      <Routes location={location}>
        {/* ══ SITE PUBLIC ══ */}
        <Route
          path="/*"
          element={
            <AppProvider>
              <SiteLayout>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route index element={<HomePage />} />
                    <Route path="offres" element={<FleetPage />} />
                    <Route path="promotions" element={<PromotionsPage />} />
                    <Route path="agences" element={<AgenciesPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="reserver" element={<BookingPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AnimatePresence>
              </SiteLayout>
            </AppProvider>
          }
        />

        {/* ══ ESPACE ADMINISTRATION ══ */}
        <Route
          path="/admin/*"
          element={
            <AdminAuthProvider>
              <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="agences" element={<AdminAgencies />} />
                  <Route path="statistiques" element={<AdminStatistics />} />
                </Route>
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AdminAuthProvider>
          }
        />
      </Routes>
    </>
  );
}
