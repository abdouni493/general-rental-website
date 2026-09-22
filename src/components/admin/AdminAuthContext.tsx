import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthService } from '../../services/AuthService';
import type { AdminUser } from '../../types';

// ============================================================================
// Session de l'espace d'administration.
// ----------------------------------------------------------------------------
// `adminExists` pilote l'affichage du bouton « Créer un compte
// administrateur » : il disparaît dès qu'un premier admin est enregistré, et
// la RPC côté serveur refuse de toute façon toute création supplémentaire.
// ============================================================================

interface AdminAuthValue {
  user: AdminUser | null;
  isLoading: boolean;
  adminExists: boolean;
  refreshAdminExists: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AdminUser | null) => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export const useAdminAuth = (): AdminAuthValue => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans <AdminAuthProvider>');
  return ctx;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const [current, exists] = await Promise.all([
        AuthService.getCurrentUser().catch(() => null),
        AuthService.adminExists().catch(() => true),
      ]);
      if (cancelled) return;
      setUser(current);
      setAdminExists(exists);
      setIsLoading(false);
    };

    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const refreshAdminExists = useCallback(async () => {
    setAdminExists(await AuthService.adminExists().catch(() => true));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const signed = await AuthService.signIn(email, password);
    setUser(signed);
    setAdminExists(true);
  }, []);

  const signOut = useCallback(async () => {
    await AuthService.signOut();
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ user, isLoading, adminExists, refreshAdminExists, signIn, signOut, setUser }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};
