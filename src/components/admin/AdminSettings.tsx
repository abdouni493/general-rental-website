import React, { useEffect, useRef, useState } from 'react';
import { Save, Upload, RotateCcw, Loader2, Check, ImageIcon, Type, LayoutTemplate, X } from 'lucide-react';

import { useSiteSettings } from '../../context/SiteSettingsContext';
import {
  DEFAULT_SITE_SETTINGS, HeroImageKey, SiteSettings, SiteSettingsService,
} from '../../services/SiteSettingsService';
import { ErrorBanner } from '../ui/Primitives';

// ============================================================================
// Paramètres du site : identité (nom, logo), textes du landing en français et
// en arabe, et photos de fond de chaque page. Tout est enregistré d'un bloc
// dans portal_settings (clé « site ») ; les images envoyées vont dans le
// bucket Storage public « site-assets ».
// ============================================================================

type Bilingual = 'tagline' | 'footerDescription' | 'heroTitle' | 'heroTitleAccent'
  | 'heroSubtitle' | 'ctaTitle' | 'ctaSubtitle';

const TEXT_FIELDS: { key: Bilingual; label: string; multiline?: boolean }[] = [
  { key: 'heroTitle', label: 'Titre principal (ligne 1)' },
  { key: 'heroTitleAccent', label: 'Titre principal (ligne 2, en couleur)' },
  { key: 'heroSubtitle', label: "Texte d'accroche", multiline: true },
  { key: 'ctaTitle', label: "Titre de l'appel à l'action (bas de page)" },
  { key: 'ctaSubtitle', label: "Texte de l'appel à l'action", multiline: true },
  { key: 'tagline', label: 'Slogan (sous le nom, en-tête)' },
  { key: 'footerDescription', label: 'Description (pied de page)', multiline: true },
];

const IMAGE_FIELDS: { key: HeroImageKey; label: string }[] = [
  { key: 'home', label: "Accueil (landing)" },
  { key: 'fleet', label: 'Véhicules' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'agencies', label: 'Agences' },
  { key: 'contact', label: 'Contact' },
];

export const AdminSettings: React.FC = () => {
  const { settings, reload } = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Recharge depuis la base à l'ouverture, pour éditer la version à jour.
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { setForm(settings); }, [settings]);

  const patch = (p: Partial<SiteSettings>) => { setForm(f => ({ ...f, ...p })); setSaved(false); };
  const patchText = (key: Bilingual, lang: 'fr' | 'ar', value: string) =>
    patch({ [key]: { ...form[key], [lang]: value } } as Partial<SiteSettings>);
  const patchImage = (key: HeroImageKey, value: string) =>
    patch({ images: { ...form.images, [key]: value } });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await SiteSettingsService.save(form);
      // Relecture : les champs vidés reprennent leur valeur d'origine.
      await reload();
      setSaved(true);
    } catch (err: any) {
      setError(`Enregistrement impossible : ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl pb-24">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1 className="font-black text-2xl sm:text-3xl leading-tight" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
            Paramètres du site
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-muted)' }}>
            Nom, logo, textes de la page d'accueil et images de fond.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => { setForm(DEFAULT_SITE_SETTINGS); setSaved(false); }}
            className="btn-ghost h-11 px-4 text-xs"
            title="Remplit le formulaire avec les valeurs d'origine (non enregistré tant que vous ne cliquez pas sur Enregistrer)"
          >
            <RotateCcw size={14} /> <span className="hidden sm:inline">Valeurs d'origine</span>
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-aurora h-11 px-5 text-xs">
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

      {/* ── Identité ── */}
      <Section icon={Type} title="Identité du site">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom du site" hint="Première partie du nom (ex. « Drive »).">
            <input className="field" value={form.siteName} onChange={e => patch({ siteName: e.target.value })} />
          </Field>
          <Field label="Suite du nom (en couleur)" hint="Optionnel (ex. « Hub »). Laissez vide pour un nom d'un seul tenant.">
            <input className="field" value={form.siteNameAccent} onChange={e => patch({ siteNameAccent: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <ImageInput
              label="Logo"
              hint="PNG/SVG carré de préférence. Laissez vide pour l'icône par défaut."
              value={form.logoUrl}
              prefix="logo"
              onChange={v => patch({ logoUrl: v })}
              onError={setError}
              square
            />
          </div>
        </div>
      </Section>

      {/* ── Textes ── */}
      <Section icon={LayoutTemplate} title="Textes de la page d'accueil">
        <div className="space-y-5">
          {TEXT_FIELDS.map(f => (
            <div key={f.key} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['fr', 'ar'] as const).map(lang => (
                <Field key={lang} label={`${f.label} — ${lang === 'fr' ? 'Français' : 'Arabe'}`}>
                  {f.multiline ? (
                    <textarea
                      className="field min-h-[84px] resize-y"
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      value={form[f.key][lang]}
                      onChange={e => patchText(f.key, lang, e.target.value)}
                    />
                  ) : (
                    <input
                      className="field"
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      value={form[f.key][lang]}
                      onChange={e => patchText(f.key, lang, e.target.value)}
                    />
                  )}
                </Field>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Images ── */}
      <Section icon={ImageIcon} title="Images de fond">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {IMAGE_FIELDS.map(f => (
            <ImageInput
              key={f.key}
              label={f.label}
              value={form.images[f.key]}
              prefix={`bg-${f.key}`}
              onChange={v => patchImage(f.key, v)}
              onError={setError}
            />
          ))}
        </div>
      </Section>
    </div>
  );
};

// ─── Briques ─────────────────────────────────────────────────────────────────

const Section: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({
  icon: Icon, title, children,
}) => (
  <section
    className="rounded-2xl p-5 sm:p-6 mb-6"
    style={{ background: 'var(--color-panel)', border: '1px solid var(--color-line)' }}
  >
    <h2 className="flex items-center gap-2 font-black text-base mb-5" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
      <Icon size={17} style={{ color: 'var(--color-iris)' }} /> {title}
    </h2>
    {children}
  </section>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>{label}</label>
    {children}
    {hint && <p className="text-[10px] mt-1.5 leading-snug" style={{ color: 'var(--color-faint)' }}>{hint}</p>}
  </div>
);

/** Aperçu + URL modifiable + envoi d'un fichier vers Supabase Storage. */
const ImageInput: React.FC<{
  label: string;
  hint?: string;
  value: string;
  prefix: string;
  square?: boolean;
  onChange: (v: string) => void;
  onError: (msg: string) => void;
}> = ({ label, hint, value, prefix, square, onChange, onError }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { onError('Le fichier choisi n’est pas une image.'); return; }
    if (file.size > 5 * 1024 * 1024) { onError('Image trop lourde (5 Mo maximum).'); return; }
    setUploading(true);
    try {
      onChange(await SiteSettingsService.uploadImage(file, prefix));
    } catch (err: any) {
      onError(`Envoi de l'image impossible : ${err?.message || err}. Le bucket « site-assets » existe-t-il ?`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-3 items-start">
        <div
          className={`${square ? 'w-20 h-20' : 'w-32 h-20'} rounded-xl overflow-hidden shrink-0 flex items-center justify-center`}
          style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
        >
          {value
            ? <img src={value} alt="" className={`w-full h-full ${square ? 'object-contain' : 'object-cover'}`} />
            : <ImageIcon size={20} style={{ color: 'var(--color-faint)' }} />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            className="field font-mono text-[11px]"
            value={value}
            placeholder="https://…"
            onChange={e => onChange(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost h-9 px-3 text-[11px]">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Téléverser
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="btn-ghost h-9 px-3 text-[11px]">
                <X size={13} /> Retirer
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
        </div>
      </div>
    </Field>
  );
};
