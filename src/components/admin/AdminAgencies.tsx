import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Plus, Pencil, Trash2, PlugZap, Loader2, Check, X,
  AlertTriangle, MapPin, Car as CarIcon, Power, RefreshCw, Link2, Phone, Mail,
} from 'lucide-react';

import { AgencyRegistry } from '../../services/AgencyRegistry';
import { AgencyConnectionModal } from './AgencyConnectionModal';
import { EmptyState, ErrorBanner, Modal, PageLoader } from '../ui/Primitives';
import { agencyColor, agencyTint } from '../../utils/format';
import { formatDateTime } from '../../utils/dates';
import type { PartnerAgency, AgencyHealth } from '../../types';

// ============================================================================
// Écran « Agences connectées »
// ----------------------------------------------------------------------------
// Liste les partenaires, montre l'état RÉEL de chaque connexion (nombre de
// véhicules et de lieux réellement lus chez eux), et permet d'en créer,
// modifier, activer/désactiver ou supprimer.
// ============================================================================

export const AdminAgencies: React.FC = () => {
  const [agencies, setAgencies] = useState<PartnerAgency[]>([]);
  const [health, setHealth] = useState<Record<string, AgencyHealth>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerAgency | null>(null);
  const [deleting, setDeleting] = useState<PartnerAgency | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await AgencyRegistry.listAll();
      setAgencies(list);
      // Le diagnostic part en arrière-plan : la liste s'affiche tout de suite.
      if (list.length) {
        setChecking(true);
        AgencyRegistry.testAll(list)
          .then(setHealth)
          .finally(() => setChecking(false));
      }
    } catch (err: any) {
      setError(
        err?.message?.includes('permission') || err?.code === '42501'
          ? "Accès refusé à la table des agences. Vérifiez que le script SQL du portail a bien été exécuté."
          : err?.message || 'Chargement impossible.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const recheck = async () => {
    if (!agencies.length) return;
    setChecking(true);
    setHealth(await AgencyRegistry.testAll(agencies));
    setChecking(false);
  };

  const toggleActive = async (agency: PartnerAgency) => {
    setBusyId(agency.id);
    try {
      await AgencyRegistry.setActive(agency.id, !agency.isActive);
      setAgencies(prev => prev.map(a => (a.id === agency.id ? { ...a, isActive: !a.isActive } : a)));
    } catch (err: any) {
      setError(err?.message || 'Modification impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await AgencyRegistry.remove(deleting.id);
      setAgencies(prev => prev.filter(a => a.id !== deleting.id));
      setDeleting(null);
    } catch (err: any) {
      setError(err?.message || 'Suppression impossible.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <PageLoader label="Chargement des connexions…" />;

  const activeCount = agencies.filter(a => a.isActive).length;
  const reachableCount = Object.values(health).filter(h => h.reachable && !h.error).length;

  return (
    <div className="max-w-6xl">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1
            className="font-black text-2xl sm:text-3xl leading-tight"
            style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
          >
            Agences connectées
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-muted)' }}>
            {agencies.length} connexion{agencies.length > 1 ? 's' : ''} · {activeCount} active{activeCount > 1 ? 's' : ''}
            {Object.keys(health).length > 0 && ` · ${reachableCount} joignable${reachableCount > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex gap-2.5">
          <button onClick={recheck} disabled={checking || !agencies.length} className="btn-ghost h-11 px-4 text-xs">
            {checking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden sm:inline">Vérifier</span>
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="btn-aurora h-11 px-5 text-xs"
          >
            <Plus size={15} /> Connecter une agence
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorBanner message={error} onRetry={load} /></div>}

      {/* ── Liste ── */}
      {agencies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune agence connectée"
          description="Connectez une première agence pour que ses véhicules apparaissent sur le portail. Il vous faut l'URL de son projet Supabase et sa clé publique anon."
          action={
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-aurora h-11 px-5 text-xs mt-2">
              <Plus size={15} /> Connecter une agence
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {agencies.map((agency, i) => {
            const status = health[agency.id];
            const accent = agencyColor(agency.brandColor);
            const isBusy = busyId === agency.id;

            return (
              <motion.div
                key={agency.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="glass-strong rounded-2xl overflow-hidden"
                style={{ opacity: agency.isActive ? 1 : 0.62 }}
              >
                <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

                <div className="p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    {/* Logo */}
                    {agency.logoUrl ? (
                      <img
                        src={agency.logoUrl}
                        alt=""
                        className="w-14 h-14 rounded-2xl object-cover shrink-0"
                        style={{ border: `1px solid ${agencyTint(agency.brandColor, 0.3)}` }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shrink-0"
                        style={{ background: accent, fontFamily: 'var(--font-display)' }}
                      >
                        {agency.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Identité */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2
                          className="font-black text-lg leading-tight"
                          style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
                        >
                          {agency.name}
                        </h2>
                        <StatusPill agency={agency} health={status} checking={checking && !status} />
                      </div>

                      <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
                        <code
                          className="px-1.5 py-0.5 rounded font-mono text-[10px]"
                          style={{ background: 'var(--color-panel-2)' }}
                        >
                          {agency.slug}
                        </code>
                        {agency.city && <> · {agency.city}</>}
                      </p>

                      <p
                        className="text-[11px] font-mono truncate flex items-center gap-1.5"
                        style={{ color: 'var(--color-faint)' }}
                        title={agency.supabaseUrl}
                      >
                        <Link2 size={11} className="shrink-0" /> {agency.supabaseUrl}
                      </p>

                      {(agency.phone || agency.email) && (
                        <div className="flex flex-wrap gap-3 mt-2 text-[11px]" style={{ color: 'var(--color-muted)' }}>
                          {agency.phone && <span className="flex items-center gap-1"><Phone size={10} /> {agency.phone}</span>}
                          {agency.email && <span className="flex items-center gap-1"><Mail size={10} /> {agency.email}</span>}
                        </div>
                      )}
                    </div>

                    {/* Mesures */}
                    {status?.reachable && (
                      <div className="flex gap-2.5 shrink-0">
                        <Metric icon={CarIcon} value={status.carCount} label="véhicules" accent={accent} />
                        <Metric icon={MapPin} value={status.pickupPointCount} label="lieux" accent={accent} />
                      </div>
                    )}
                  </div>

                  {/* Anomalie */}
                  {status && (!status.reachable || status.error) && (
                    <div
                      className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2.5"
                      style={{ background: 'rgba(176,123,18,0.08)', border: '1px solid rgba(176,123,18,0.26)' }}
                    >
                      <AlertTriangle size={15} style={{ color: 'var(--color-amber)' }} className="shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: 'var(--color-title)' }}>
                          {status.reachable ? 'Connexion partielle' : 'Agence injoignable'}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
                          {status.error}
                          {!status.reachable && " Le portail continue de fonctionner : les véhicules des autres agences restent affichés."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    className="flex flex-wrap items-center gap-2 mt-4 pt-4"
                    style={{ borderTop: '1px solid var(--color-line-soft)' }}
                  >
                    <button
                      onClick={() => { setEditing(agency); setModalOpen(true); }}
                      className="btn-ghost h-10 px-4 text-xs"
                    >
                      <Pencil size={13} /> Modifier
                    </button>

                    <button onClick={() => toggleActive(agency)} disabled={isBusy} className="btn-ghost h-10 px-4 text-xs">
                      {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                      {agency.isActive ? 'Désactiver' : 'Activer'}
                    </button>

                    <button
                      onClick={async () => {
                        setBusyId(agency.id);
                        const result = await AgencyRegistry.testConnection({ ...agency, id: agency.id });
                        setHealth(prev => ({ ...prev, [agency.id]: result }));
                        setBusyId(null);
                      }}
                      disabled={isBusy}
                      className="btn-ghost h-10 px-4 text-xs"
                    >
                      {isBusy ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />}
                      Tester
                    </button>

                    <button
                      onClick={() => setDeleting(agency)}
                      className="h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors ml-auto"
                      style={{
                        color: 'var(--color-coral)',
                        background: 'rgba(194,14,26,0.08)',
                        border: '1px solid rgba(194,14,26,0.2)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>

                  <p className="text-[10px] mt-3" style={{ color: 'var(--color-faint)' }}>
                    Connectée le {formatDateTime(agency.createdAt)}
                    {status && ` · vérifiée ${formatDateTime(status.checkedAt)}`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Formulaire ── */}
      <AnimatePresence>
        {modalOpen && (
          <AgencyConnectionModal
            open={modalOpen}
            agency={editing}
            onClose={() => { setModalOpen(false); setEditing(null); }}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      {/* ── Confirmation de suppression ── */}
      <AnimatePresence>
        {deleting && (
          <Modal
            open
            onClose={() => setDeleting(null)}
            title={`Supprimer « ${deleting.name} » ?`}
            subtitle="Cette connexion sera retirée du portail."
            width="max-w-lg"
            footer={
              <>
                <button onClick={() => setDeleting(null)} className="btn-ghost h-11 px-5 text-xs">
                  <X size={14} /> Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={busyId === deleting.id}
                  className="h-11 px-6 rounded-xl text-xs font-bold inline-flex items-center gap-2 text-white"
                  style={{ background: 'var(--color-coral)', fontFamily: 'var(--font-display)' }}
                >
                  {busyId === deleting.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Supprimer définitivement
                </button>
              </>
            }
          >
            <div className="space-y-3 text-sm" style={{ color: 'var(--color-body)' }}>
              <p>
                Ses véhicules disparaîtront immédiatement du site public et il ne sera plus possible
                de lui envoyer de réservation.
              </p>
              <div
                className="rounded-xl px-4 py-3 flex items-start gap-2.5"
                style={{ background: 'rgba(70,130,84,0.08)', border: '1px solid rgba(70,130,84,0.24)' }}
              >
                <Check size={15} style={{ color: 'var(--color-mint)' }} className="shrink-0 mt-0.5" />
                <p className="text-xs">
                  Rien n'est supprimé chez l'agence : sa base, ses véhicules et les réservations
                  qu'elle a déjà reçues restent intacts. Seule la connexion disparaît. Si vous
                  souhaitez juste la masquer temporairement, utilisez « Désactiver ».
                </p>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Pastilles et mesures ────────────────────────────────────────────────────

const StatusPill: React.FC<{
  agency: PartnerAgency;
  health?: AgencyHealth;
  checking: boolean;
}> = ({ agency, health, checking }) => {
  if (!agency.isActive) {
    return <Pill color="var(--color-faint)" bg="var(--color-panel-2)" label="Désactivée" />;
  }
  if (checking) {
    return <Pill color="var(--color-aqua)" bg="var(--color-aqua-soft)" label="Vérification…" spinning />;
  }
  if (!health) {
    return <Pill color="var(--color-muted)" bg="var(--color-panel-2)" label="Non vérifiée" />;
  }
  if (!health.reachable) {
    return <Pill color="var(--color-coral)" bg="rgba(194,14,26,0.1)" label="Injoignable" />;
  }
  if (health.error) {
    return <Pill color="var(--color-amber)" bg="rgba(176,123,18,0.1)" label="Partielle" />;
  }
  return <Pill color="var(--color-mint)" bg="rgba(70,130,84,0.1)" label="En ligne" live />;
};

const Pill: React.FC<{
  color: string; bg: string; label: string; live?: boolean; spinning?: boolean;
}> = ({ color, bg, label, live, spinning }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
    style={{ color, background: bg, border: `1px solid ${color}33`, fontFamily: 'var(--font-display)' }}
  >
    {spinning ? (
      <Loader2 size={9} className="animate-spin" />
    ) : (
      <span className={live ? 'w-1.5 h-1.5 rounded-full dot-live' : 'w-1.5 h-1.5 rounded-full'} style={{ background: color, color }} />
    )}
    {label}
  </span>
);

const Metric: React.FC<{ icon: React.ElementType; value: number; label: string; accent: string }> = ({
  icon: Icon, value, label, accent,
}) => (
  <div
    className="rounded-xl px-3.5 py-2.5 text-center min-w-[4.75rem]"
    style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
  >
    <Icon size={13} style={{ color: accent }} className="mx-auto mb-1" />
    <p className="font-black text-base leading-none" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
      {value}
    </p>
    <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--color-faint)' }}>
      {label}
    </p>
  </div>
);
