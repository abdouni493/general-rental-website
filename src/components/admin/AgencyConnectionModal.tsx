import React, { useEffect, useState } from 'react';
import {
  Building2, Link2, KeyRound, MapPin, Phone, Mail, Palette,
  Image, Hash, Loader2, PlugZap, Check, AlertTriangle, Info,
} from 'lucide-react';

import { Modal, Toggle } from '../ui/Primitives';
import { AgencyRegistry, type AgencyConnectionInput } from '../../services/AgencyRegistry';
import { slugify } from '../../utils/format';
import type { PartnerAgency, AgencyHealth } from '../../types';

// ============================================================================
// Formulaire de connexion d'une agence.
// ----------------------------------------------------------------------------
// Ce que l'administrateur doit fournir, et rien de plus :
//   • le NOM de l'agence, tel qu'il s'affichera sur le portail ;
//   • l'URL de son projet Supabase ;
//   • sa clé « anon » (celle que sert déjà son propre site public) ;
//   • quelques éléments de présentation (ville, logo, couleur, contacts).
//
// Le bouton « Tester la connexion » interroge réellement l'agence avant
// l'enregistrement : on ne connecte jamais une agence en aveugle.
// ============================================================================

const EMPTY: AgencyConnectionInput = {
  name: '', slug: '', city: '',
  supabaseUrl: '', anonKey: '',
  logoUrl: '', brandColor: '#D4002A',
  phone: '', email: '', address: '',
  isActive: true, displayOrder: 0,
};

export const AgencyConnectionModal: React.FC<{
  open: boolean;
  agency: PartnerAgency | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, agency, onClose, onSaved }) => {
  const [form, setForm] = useState<AgencyConnectionInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<AgencyHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (agency) {
      setForm({
        name: agency.name,
        slug: agency.slug,
        city: agency.city || '',
        supabaseUrl: agency.supabaseUrl,
        anonKey: agency.anonKey,
        logoUrl: agency.logoUrl || '',
        brandColor: agency.brandColor || '#D4002A',
        phone: agency.phone || '',
        email: agency.email || '',
        address: agency.address || '',
        isActive: agency.isActive,
        displayOrder: agency.displayOrder,
      });
      setSlugTouched(true);
    } else {
      setForm(EMPTY);
      setSlugTouched(false);
    }
    setHealth(null);
    setError(null);
  }, [open, agency]);

  const set = <K extends keyof AgencyConnectionInput>(key: K, value: AgencyConnectionInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // L'identifiant court suit le nom tant que l'admin ne l'a pas repris à la main.
  const onNameChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const urlLooksValid = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(form.supabaseUrl.trim());
  const keyLooksValid = form.anonKey.trim().split('.').length === 3;
  const canSave = !!form.name.trim() && !!form.slug.trim() && urlLooksValid && keyLooksValid;

  const runTest = async () => {
    if (!urlLooksValid || !keyLooksValid) return;
    setTesting(true);
    setHealth(null);
    try {
      const result = await AgencyRegistry.testConnection({
        supabaseUrl: form.supabaseUrl,
        anonKey: form.anonKey,
        name: form.name || 'Agence',
        id: agency?.id,
      });
      setHealth(result);
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (agency) await AgencyRegistry.update(agency.id, form);
      else await AgencyRegistry.create(form);
      onSaved();
      onClose();
    } catch (err: any) {
      const message = err?.message || '';
      setError(
        message.includes('duplicate') || message.includes('unique')
          ? "Cet identifiant court est déjà pris par une autre agence."
          : message || "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={agency ? `Modifier « ${agency.name} »` : 'Connecter une nouvelle agence'}
      subtitle="Le portail lit la flotte de cette agence et lui transmet les réservations. Aucune donnée n'est copiée."
      width="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost h-11 px-5 text-xs" disabled={saving}>
            Annuler
          </button>
          <button
            onClick={runTest}
            disabled={!urlLooksValid || !keyLooksValid || testing}
            className="btn-ghost h-11 px-5 text-xs"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
            Tester la connexion
          </button>
          <button onClick={save} disabled={!canSave || saving} className="btn-aurora h-11 px-6 text-xs">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {agency ? 'Enregistrer' : 'Connecter'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-2.5"
            style={{ background: 'rgba(194,14,26,0.1)', border: '1px solid rgba(194,14,26,0.3)' }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--color-coral)' }} className="shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: 'var(--color-title)' }}>{error}</p>
          </div>
        )}

        {/* ── Identité ── */}
        <Section title="Identité de l'agence" icon={Building2}>
          <Field label="Nom affiché *" hint="Tel qu'il apparaîtra sur les cartes de véhicule.">
            <input className="field" value={form.name} onChange={e => onNameChange(e.target.value)} placeholder="MHD Auto" />
          </Field>

          <Field label="Identifiant court *" hint="Lettres, chiffres et tirets. Sert dans les URL et les filtres.">
            <div className="relative">
              <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input
                className="field pl-9"
                value={form.slug}
                onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                placeholder="mhd-auto"
              />
            </div>
          </Field>

          <Field label="Ville">
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input className="field pl-9" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Alger" />
            </div>
          </Field>

          <Field label="Ordre d'affichage" hint="Les plus petits nombres apparaissent en premier.">
            <input
              type="number"
              className="field"
              value={form.displayOrder}
              onChange={e => set('displayOrder', Number(e.target.value) || 0)}
            />
          </Field>
        </Section>

        {/* ── Connexion technique ── */}
        <Section title="Connexion à la base de l'agence" icon={Link2}>
          <Field
            label="URL du projet Supabase *"
            hint="Tableau de bord Supabase de l'agence → Settings → API → Project URL."
            wide
          >
            <div className="relative">
              <Link2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input
                className="field pl-9 font-mono text-xs"
                value={form.supabaseUrl}
                onChange={e => set('supabaseUrl', e.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                spellCheck={false}
              />
            </div>
            {form.supabaseUrl && !urlLooksValid && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-amber)' }}>
                Format attendu : https://identifiant.supabase.co
              </p>
            )}
          </Field>

          <Field
            label="Clé publique « anon » *"
            hint="Settings → API → Project API keys → anon / public. C'est la clé que le site de l'agence utilise déjà."
            wide
          >
            <div className="relative">
              <KeyRound size={14} className="absolute left-3.5 top-3.5" style={{ color: 'var(--color-muted)' }} />
              <textarea
                className="field pl-9 font-mono text-[11px] min-h-[76px] resize-y"
                value={form.anonKey}
                onChange={e => set('anonKey', e.target.value.trim())}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                spellCheck={false}
              />
            </div>
            {form.anonKey && !keyLooksValid && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-amber)' }}>
                Une clé anon est un jeton JWT en trois parties séparées par des points.
              </p>
            )}
          </Field>

          <div className="sm:col-span-2">
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2.5"
              style={{ background: 'var(--color-aqua-soft)', border: '1px solid var(--color-line-soft)' }}
            >
              <Info size={15} style={{ color: 'var(--color-aqua)' }} className="shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                La clé anon est publique par conception : elle est déjà servie par le site de l'agence.
                Les règles de sécurité (RLS) de son projet restent la seule barrière — le portail ne peut
                lire que les tables de la vitrine et n'écrit que par la fonction
                <code className="mx-1 px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ background: 'var(--color-panel-3)' }}>
                  create_website_reservation
                </code>
                . N'utilisez jamais une clé « service_role » ici.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Résultat du test ── */}
        {health && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: health.reachable && !health.error ? 'rgba(70,130,84,0.08)' : 'rgba(176,123,18,0.08)',
              border: `1px solid ${health.reachable && !health.error ? 'rgba(70,130,84,0.3)' : 'rgba(176,123,18,0.3)'}`,
            }}
          >
            <div className="flex items-start gap-3">
              {health.reachable && !health.error ? (
                <Check size={18} style={{ color: 'var(--color-mint)' }} className="shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} style={{ color: 'var(--color-amber)' }} className="shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                  {health.reachable && !health.error
                    ? 'Connexion établie'
                    : health.reachable
                      ? 'Connexion partielle'
                      : 'Connexion impossible'}
                </p>
                {health.reachable && (
                  <p className="text-xs mt-1" style={{ color: 'var(--color-body)' }}>
                    {health.carCount} véhicule{health.carCount > 1 ? 's' : ''} visible{health.carCount > 1 ? 's' : ''} ·{' '}
                    {health.pickupPointCount} lieu{health.pickupPointCount > 1 ? 'x' : ''} de retrait
                  </p>
                )}
                {health.error && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--color-amber)' }}>{health.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Présentation ── */}
        <Section title="Présentation sur le portail" icon={Palette}>
          <Field label="Couleur d'accent" hint="Utilisée pour les pastilles et les filtres de cette agence.">
            <div className="flex gap-2.5">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(form.brandColor) ? form.brandColor : '#D4002A'}
                onChange={e => set('brandColor', e.target.value)}
                className="w-12 h-[46px] rounded-xl cursor-pointer shrink-0"
                style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line)' }}
                aria-label="Choisir la couleur"
              />
              <input
                className="field font-mono text-xs"
                value={form.brandColor}
                onChange={e => set('brandColor', e.target.value)}
                placeholder="#D4002A"
              />
            </div>
          </Field>

          <Field label="URL du logo" hint="Laissez vide pour afficher l'initiale de l'agence.">
            <div className="relative">
              <Image size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input
                className="field pl-9 text-xs"
                value={form.logoUrl}
                onChange={e => set('logoUrl', e.target.value)}
                placeholder="https://…/logo.png"
                spellCheck={false}
              />
            </div>
          </Field>

          <Field label="Téléphone">
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input className="field pl-9" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0555 00 00 00" />
            </div>
          </Field>

          <Field label="E-mail">
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
              <input className="field pl-9" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@agence.dz" />
            </div>
          </Field>

          <Field label="Adresse" wide>
            <input className="field" value={form.address} onChange={e => set('address', e.target.value)} placeholder="12 rue des Frères Bouadou, Alger" />
          </Field>

          <div className="sm:col-span-2 pt-1">
            <Toggle
              checked={form.isActive}
              onChange={v => set('isActive', v)}
              label="Agence active"
              hint="Décochez pour retirer temporairement ses véhicules du site sans supprimer la connexion."
            />
          </div>
        </Section>
      </div>
    </Modal>
  );
};

const Section: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({
  title, icon: Icon, children,
}) => (
  <div>
    <p className="label mb-3.5">
      <Icon size={12} style={{ color: 'var(--color-iris)' }} /> {title}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; hint?: string; wide?: boolean; children: React.ReactNode }> = ({
  label, hint, wide, children,
}) => (
  <div className={wide ? 'sm:col-span-2' : ''}>
    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }}>
      {label}
    </label>
    {children}
    {hint && <p className="text-[10px] mt-1.5 leading-snug" style={{ color: 'var(--color-faint)' }}>{hint}</p>}
  </div>
);
