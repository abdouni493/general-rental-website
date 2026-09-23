import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, SiteSettings, SiteSettingsService } from '../services/SiteSettingsService';

// ============================================================================
// Réglages du site partagés par le site public ET l'administration : une
// sauvegarde dans « Paramètres » se voit aussitôt dans la barre latérale.
// Tant que la base n'a pas répondu (ou si elle échoue), les valeurs par
// défaut s'affichent — le site n'attend jamais ses réglages pour s'ouvrir.
// ============================================================================

interface Ctx {
  settings: SiteSettings;
  setSettings: (s: SiteSettings) => void;
  reload: () => Promise<void>;
}

const SiteSettingsContext = createContext<Ctx>({
  settings: DEFAULT_SITE_SETTINGS,
  setSettings: () => {},
  reload: async () => {},
});

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  const reload = useCallback(async () => {
    try {
      setSettings(await SiteSettingsService.load());
    } catch (err) {
      console.warn('Réglages du site indisponibles, valeurs par défaut utilisées.', err);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Titre de l'onglet et favicon suivent le nom et le logo.
  useEffect(() => {
    document.title = `${settings.siteName}${settings.siteNameAccent} — Location de voitures`;
    if (settings.logoUrl) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.logoUrl;
    }
  }, [settings.siteName, settings.siteNameAccent, settings.logoUrl]);

  return (
    <SiteSettingsContext.Provider value={{ settings, setSettings, reload }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
