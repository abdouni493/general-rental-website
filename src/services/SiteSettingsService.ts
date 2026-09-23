import { supabase } from '../lib/supabase';

// ============================================================================
// Réglages du site (portal_settings, clé « site »)
// ----------------------------------------------------------------------------
// Tout ce que l'administrateur peut modifier depuis « Paramètres » : nom,
// logo, textes du landing (FR + AR) et photos de fond. Les valeurs absentes
// de la base retombent sur DEFAULT_SITE_SETTINGS, si bien qu'un réglage
// jamais enregistré garde l'apparence d'origine.
// ============================================================================

export const SETTINGS_BUCKET = 'site-assets';

export interface SiteSettings {
  siteName: string;
  /** Partie du nom mise en couleur après siteName (ex. « Hub »). */
  siteNameAccent: string;
  logoUrl: string;
  tagline: { fr: string; ar: string };
  footerDescription: { fr: string; ar: string };
  heroTitle: { fr: string; ar: string };
  heroTitleAccent: { fr: string; ar: string };
  heroSubtitle: { fr: string; ar: string };
  ctaTitle: { fr: string; ar: string };
  ctaSubtitle: { fr: string; ar: string };
  images: {
    home: string;
    fleet: string;
    promotions: string;
    agencies: string;
    contact: string;
    booking: string;
  };
}

export type HeroImageKey = keyof SiteSettings['images'];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'Drive',
  siteNameAccent: 'Hub',
  logoUrl: '',
  tagline: { fr: 'agences · une seule réservation', ar: 'كل الوكالات · حجز واحد' },
  footerDescription: {
    fr: "Le portail qui réunit la flotte de plusieurs agences de location. Comparez, choisissez, réservez : votre demande part directement à l'agence propriétaire du véhicule.",
    ar: 'البوابة التي تجمع أسطول عدة وكالات تأجير. قارن واختر واحجز: يصل طلبك مباشرة إلى الوكالة المالكة للسيارة.',
  },
  heroTitle: { fr: 'Toutes les agences.', ar: 'كل الوكالات.' },
  heroTitleAccent: { fr: 'Une seule réservation.', ar: 'حجز واحد.' },
  heroSubtitle: {
    fr: "Comparez les flottes de nos agences partenaires en un seul endroit. Votre réservation part directement à l'agence qui possède le véhicule choisi.",
    ar: 'قارن أساطيل وكالاتنا الشريكة في مكان واحد. يصل حجزك مباشرة إلى الوكالة المالكة للسيارة المختارة.',
  },
  ctaTitle: { fr: 'Prêt à prendre la route ?', ar: 'مستعد للانطلاق؟' },
  ctaSubtitle: {
    fr: 'Choisissez votre véhicule, indiquez vos dates, et laissez-nous transmettre le reste.',
    ar: 'اختر سيارتك، حدد تواريخك، ودعنا نتكفل بالباقي.',
  },
  images: {
    home: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2400&q=80',
    fleet: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2000&q=80',
    promotions: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=2000&q=80',
    agencies: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=2000&q=80',
    contact: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=2000&q=80',
    booking: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=2000&q=80',
  },
};

/** Fusion profonde « base ← enregistré » : un champ vide garde la valeur par défaut. */
function merge<T>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== 'object') return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const key of Object.keys(base as any)) {
    const b = (base as any)[key];
    const s = (saved as any)[key];
    if (b && typeof b === 'object') out[key] = merge(b, s);
    else if (typeof s === 'string' && s.trim() !== '') out[key] = s;
  }
  return out;
}

export const SiteSettingsService = {
  async load(): Promise<SiteSettings> {
    const { data, error } = await supabase
      .from('portal_settings')
      .select('value')
      .eq('key', 'site')
      .maybeSingle();
    if (error) throw error;
    return merge(DEFAULT_SITE_SETTINGS, data?.value);
  },

  async save(settings: SiteSettings): Promise<void> {
    const { error } = await supabase
      .from('portal_settings')
      .upsert({ key: 'site', value: settings }, { onConflict: 'key' });
    if (error) throw error;
  },

  /** Envoie une image dans le bucket public et renvoie son URL publique. */
  async uploadImage(file: File, prefix: string): Promise<string> {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(SETTINGS_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from(SETTINGS_BUCKET).getPublicUrl(path).data.publicUrl;
  },
};
