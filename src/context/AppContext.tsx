import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Language, Theme, PublicAgency, Car, PickupPoint, SpecialOffer,
} from '../types';
import { AgencyRegistry } from '../services/AgencyRegistry';
import { FleetService } from '../services/FleetService';

// ============================================================================
// AppContext — état partagé du site public
// ----------------------------------------------------------------------------
// Charge UNE fois le registre des agences puis, en parallèle, la flotte, les
// points de retrait et les offres spéciales de chacune. Toutes les pages de la
// vitrine lisent ce contexte : un seul aller-retour réseau pour l'ensemble du
// site, et un filtre d'agence qui s'applique instantanément.
// ============================================================================

interface AppContextValue {
  // Langue & thème
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;

  // Données agrégées
  agencies: PublicAgency[];
  cars: Car[];
  pickupPoints: PickupPoint[];
  specialOffers: SpecialOffer[];
  /** Vrai tant qu'AUCUNE agence n'a encore répondu. */
  isLoading: boolean;
  /** Vrai tant qu'il reste une agence en cours d'interrogation. */
  isSyncing: boolean;
  loadError: string | null;
  reload: () => void;

  // Filtre d'agence — partagé entre le landing et la page Offres
  agencyFilter: string;            // '' = toutes les agences
  setAgencyFilter: (key: string) => void;
  /** Voitures visibles compte tenu du filtre courant. */
  filteredCars: Car[];

  // Raccourcis
  agencyById: (key: string) => PublicAgency | undefined;
  pointsOfAgency: (key: string) => PickupPoint[];
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>');
  return ctx;
};

const THEME_KEY = 'drivehub-theme-site';
const LANG_KEY = 'drivehub-lang';

const readStored = <T extends string>(key: string, allowed: T[], fallback: T): T => {
  try {
    const value = localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => readStored(LANG_KEY, ['fr', 'ar'], 'fr'));
  const [theme, setTheme] = useState<Theme>(() => readStored(THEME_KEY, ['dark', 'light'], 'light'));

  const [agencies, setAgencies] = useState<PublicAgency[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agencyFilter, setAgencyFilter] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  // ── Langue ────────────────────────────────────────────────────────────────
  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* mode privé */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // ── Thème ─────────────────────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* mode privé */ }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // ── Chargement des données ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setIsSyncing(true);
      setLoadError(null);
      setCars([]); setPickupPoints([]); setSpecialOffers([]);

      try {
        const list = await AgencyRegistry.listPublic();
        if (cancelled) return;
        setAgencies(list);

        if (list.length === 0) {
          setIsLoading(false);
          setIsSyncing(false);
          return;
        }

        // Chargement PROGRESSIF, agence par agence.
        //
        // Un `Promise.all` global ferait attendre tout le monde derrière la
        // plus lente : une agence dont le projet Supabase est en pause ne
        // répond jamais et la vitrine resterait vide jusqu'au délai de garde,
        // alors que les autres ont déjà tout renvoyé. Chaque agence alimente
        // donc la page dès qu'elle répond, et la grille se remplit au fil de
        // l'eau. `isLoading` tombe au premier retour, `isSyncing` au dernier.
        await Promise.all(
          list.map(async agency => {
            const [fleet, points, offers] = await Promise.all([
              FleetService.getAllCars([agency]),
              FleetService.getAllPickupPoints([agency]),
              FleetService.getAllSpecialOffers([agency]),
            ]);
            if (cancelled) return;

            setCars(prev => [...prev, ...fleet]);
            setPickupPoints(prev => [...prev, ...points]);
            setSpecialOffers(prev => [...prev, ...offers]);
            setIsLoading(false);
          }),
        );
      } catch (err: any) {
        if (!cancelled) {
          console.error('[portail] chargement impossible :', err);
          setLoadError(err?.message || 'Chargement impossible.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken(t => t + 1), []);

  // Une agence retirée du registre ne doit pas laisser un filtre orphelin.
  useEffect(() => {
    if (agencyFilter && !agencies.some(a => a.id === agencyFilter)) setAgencyFilter('');
  }, [agencies, agencyFilter]);

  const filteredCars = useMemo(
    () => (agencyFilter ? cars.filter(c => c.agencyKey === agencyFilter) : cars),
    [cars, agencyFilter],
  );

  const agencyById = useCallback(
    (key: string) => agencies.find(a => a.id === key),
    [agencies],
  );

  const pointsOfAgency = useCallback(
    (key: string) => pickupPoints.filter(p => p.agencyKey === key),
    [pickupPoints],
  );

  const value: AppContextValue = {
    lang, setLang, theme, toggleTheme,
    agencies, cars, pickupPoints, specialOffers,
    isLoading, isSyncing, loadError, reload,
    agencyFilter, setAgencyFilter, filteredCars,
    agencyById, pointsOfAgency,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
