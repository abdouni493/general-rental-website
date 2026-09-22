import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, CalendarCheck, TrendingUp, Timer, Building2, Filter,
  Download, RefreshCw, Loader2, CheckCircle2, XCircle, Car as CarIcon,
  ChevronDown, ChevronUp, Trophy, Wallet,
} from 'lucide-react';

import { StatsService, type StatsFilter } from '../../services/StatsService';
import { AgencyRegistry } from '../../services/AgencyRegistry';
import { StatTile, PageLoader, ErrorBanner, EmptyState } from '../ui/Primitives';
import { money, moneyCompact, agencyColor, agencyTint } from '../../utils/format';
import { formatDateTime, formatDateShort, formatMonthKey, today, addDays } from '../../utils/dates';
import type { PartnerAgency, PortalStats, PortalReservation } from '../../types';

// ============================================================================
// Écran « Statistiques »
// ----------------------------------------------------------------------------
// Mesure ce que le PORTAIL apporte : uniquement les réservations qu'il a
// émises. Les locations reçues en direct par les agences sur leur propre site
// ne sont pas comptées ici — c'est volontaire, on mesure l'apport du canal.
// ============================================================================

export const AdminStatistics: React.FC = () => {
  const [agencies, setAgencies] = useState<PartnerAgency[]>([]);
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [filter, setFilter] = useState<StatsFilter>({
    from: addDays(today(), -365),
    to: today(),
    agencyId: undefined,
  });

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [list, computed] = await Promise.all([
        agencies.length ? Promise.resolve(agencies) : AgencyRegistry.listAll(),
        StatsService.getStats(filter),
      ]);
      setAgencies(list);
      setStats(computed);
    } catch (err: any) {
      setError(
        err?.message?.includes('permission') || err?.code === '42501'
          ? "Accès refusé au journal des réservations. Exécutez sql/01_portail.sql dans le projet Supabase du portail."
          : err?.message || 'Chargement impossible.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, agencies.length]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const exportCsv = () => {
    if (!stats) return;
    const header = [
      'Date', 'Agence', 'Véhicule', 'Client', 'Téléphone', 'E-mail',
      'Départ', 'Retour', 'Jours', 'Lieu de retrait', 'Total DA', 'Statut', 'Référence agence',
    ];
    const rows = stats.recent.map(r => [
      r.createdAt, r.agencyName, r.carLabel, r.clientName, r.clientPhone || '', r.clientEmail || '',
      r.departureDate, r.returnDate, r.totalDays, r.pickupPointName || '', r.totalPrice,
      r.status === 'sent' ? 'Transmise' : 'Échec', r.remoteReservationId || '',
    ]);
    const csv = [header, ...rows]
      .map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    // Le BOM force Excel à lire le fichier en UTF-8 (accents corrects).
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drivehub-reservations-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const maxMonth = useMemo(
    () => Math.max(1, ...(stats?.byMonth.map(m => m.count) || [1])),
    [stats],
  );

  if (loading) return <PageLoader label="Calcul des statistiques…" />;

  return (
    <div className="max-w-6xl">
      {/* ── En-tête ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <h1
            className="font-black text-2xl sm:text-3xl leading-tight"
            style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
          >
            Statistiques du portail
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-muted)' }}>
            Réservations créées depuis ce site et transmises aux agences partenaires.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost h-11 px-4 text-xs">
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button onClick={exportCsv} disabled={!stats?.recent.length} className="btn-ghost h-11 px-4 text-xs">
            <Download size={14} /> <span className="hidden sm:inline">Exporter CSV</span>
          </button>
        </div>
      </div>

      {error && <div className="mb-6"><ErrorBanner message={error} onRetry={() => load()} /></div>}

      {/* ── Filtres ── */}
      <div className="glass-strong rounded-2xl p-4 mb-6">
        <p className="label mb-3">
          <Filter size={12} style={{ color: 'var(--color-iris)' }} /> Période et agence
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }} htmlFor="stat-from">
              Du
            </label>
            <input
              id="stat-from"
              type="date"
              className="field"
              value={filter.from || ''}
              max={filter.to}
              onChange={e => setFilter(f => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }} htmlFor="stat-to">
              Au
            </label>
            <input
              id="stat-to"
              type="date"
              className="field"
              value={filter.to || ''}
              min={filter.from}
              onChange={e => setFilter(f => ({ ...f, to: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--color-muted)' }} htmlFor="stat-agency">
              Agence
            </label>
            <select
              id="stat-agency"
              className="field"
              value={filter.agencyId || ''}
              onChange={e => setFilter(f => ({ ...f, agencyId: e.target.value || undefined }))}
            >
              <option value="">Toutes les agences</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Tuiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        <StatTile
          label="Réservations transmises"
          value={`${stats?.sentReservations ?? 0}`}
          hint={stats?.failedReservations ? `${stats.failedReservations} échec(s)` : 'aucun échec'}
          icon={CalendarCheck}
          accent="var(--color-mint)"
          delay={0}
        />
        <StatTile
          label="Chiffre d'affaires apporté"
          value={stats ? moneyCompact(stats.totalRevenue) : '—'}
          hint="total des locations transmises"
          icon={TrendingUp}
          accent="var(--color-iris)"
          delay={0.07}
        />
        <StatTile
          label="Panier moyen"
          value={stats ? money(stats.averageBasket) : '—'}
          hint="par réservation"
          icon={Wallet}
          accent="var(--color-aqua)"
          delay={0.14}
        />
        <StatTile
          label="Durée moyenne"
          value={stats ? `${stats.averageDuration} j` : '—'}
          hint="jours de location"
          icon={Timer}
          accent="var(--color-magenta)"
          delay={0.21}
        />
      </div>

      {(!stats || stats.totalReservations === 0) ? (
        <div className="glass-strong rounded-2xl">
          <EmptyState
            icon={BarChart3}
            title="Aucune réservation sur cette période"
            description="Dès qu'un client réservera depuis le portail, la demande apparaîtra ici avec l'agence à laquelle elle a été transmise."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Courbe mensuelle ── */}
          <section className="glass-strong rounded-2xl p-5">
            <h2
              className="font-black text-base mb-5 flex items-center gap-2"
              style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
            >
              <BarChart3 size={17} style={{ color: 'var(--color-iris)' }} /> Réservations par mois
            </h2>

            <div className="flex items-end gap-1.5 h-44">
              {stats.byMonth.map((m, i) => {
                const height = (m.count / maxMonth) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0 group">
                    <span
                      className="text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}
                    >
                      {m.count || ''}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, m.count ? 6 : 2)}%` }}
                      transition={{ duration: 0.65, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full rounded-t-lg relative"
                      style={{
                        background: m.count
                          ? 'linear-gradient(180deg, var(--color-iris), var(--color-iris-dark))'
                          : 'var(--color-panel-3)',
                        minHeight: 3,
                      }}
                      title={`${formatMonthKey(m.month)} — ${m.count} réservation(s), ${money(m.revenue)}`}
                    />
                    <span
                      className="text-[9px] font-bold whitespace-nowrap truncate w-full text-center"
                      style={{ color: 'var(--color-faint)' }}
                    >
                      {formatMonthKey(m.month)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Par agence ── */}
            <section className="glass-strong rounded-2xl p-5">
              <h2
                className="font-black text-base mb-5 flex items-center gap-2"
                style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
              >
                <Building2 size={17} style={{ color: 'var(--color-aqua)' }} /> Répartition par agence
              </h2>

              {stats.byAgency.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: 'var(--color-muted)' }}>
                  Aucune réservation transmise.
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.byAgency.map((row, i) => {
                    const agency = agencies.find(a => a.id === row.agencyId);
                    const accent = agencyColor(agency?.brandColor);
                    const share = stats.sentReservations ? (row.count / stats.sentReservations) * 100 : 0;

                    return (
                      <div key={row.agencyId}>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="text-sm font-bold truncate" style={{ color: 'var(--color-title)' }}>
                            {row.agencyName}
                          </span>
                          <span className="text-xs font-bold shrink-0 tabular-nums" style={{ color: 'var(--color-muted)' }}>
                            {row.count} · {money(row.revenue)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-panel-3)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${share}%` }}
                            transition={{ duration: 0.75, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${accent}, ${accent}99)` }}
                          />
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--color-faint)' }}>
                          {share.toFixed(0)} % des réservations du portail
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Véhicules les plus demandés ── */}
            <section className="glass-strong rounded-2xl p-5">
              <h2
                className="font-black text-base mb-5 flex items-center gap-2"
                style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
              >
                <Trophy size={17} style={{ color: 'var(--color-magenta)' }} /> Véhicules les plus demandés
              </h2>

              {stats.topCars.length === 0 ? (
                <p className="text-sm py-6 text-center" style={{ color: 'var(--color-muted)' }}>
                  Pas encore de classement.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {stats.topCars.map((car, i) => (
                    <motion.div
                      key={`${car.agencyName}-${car.carLabel}`}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                      style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
                    >
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                        style={{
                          color: i < 3 ? '#fff' : 'var(--color-muted)',
                          background: i === 0
                            ? 'linear-gradient(135deg, var(--color-magenta), var(--color-magenta-dark))'
                            : i < 3 ? 'var(--color-iris)' : 'var(--color-panel-3)',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--color-title)' }}>{car.carLabel}</p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--color-faint)' }}>{car.agencyName}</p>
                      </div>
                      <span className="text-xs font-black shrink-0" style={{ color: 'var(--color-iris)', fontFamily: 'var(--font-display)' }}>
                        ×{car.count}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Journal détaillé ── */}
          <section className="glass-strong rounded-2xl overflow-hidden">
            <div className="p-5" style={{ borderBottom: '1px solid var(--color-line-soft)' }}>
              <h2
                className="font-black text-base flex items-center gap-2"
                style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
              >
                <CarIcon size={17} style={{ color: 'var(--color-iris)' }} /> Journal des demandes
                <span className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                  ({stats.recent.length})
                </span>
              </h2>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-line-soft)' }}>
              {stats.recent.map(row => (
                <ReservationRow
                  key={row.id}
                  row={row}
                  agencies={agencies}
                  expanded={expanded === row.id}
                  onToggle={() => setExpanded(prev => (prev === row.id ? null : row.id))}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

// ─── Ligne du journal ────────────────────────────────────────────────────────

const ReservationRow: React.FC<{
  row: PortalReservation;
  agencies: PartnerAgency[];
  expanded: boolean;
  onToggle: () => void;
}> = ({ row, agencies, expanded, onToggle }) => {
  const agency = agencies.find(a => a.id === row.agencyId);
  const accent = agencyColor(agency?.brandColor);
  const sent = row.status === 'sent';

  return (
    <div>
      <button onClick={onToggle} className="w-full text-left px-5 py-4 flex items-center gap-4 transition-colors hover:bg-[var(--color-panel-2)]">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: sent ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.12)' }}
        >
          {sent
            ? <CheckCircle2 size={16} style={{ color: 'var(--color-mint)' }} />
            : <XCircle size={16} style={{ color: 'var(--color-coral)' }} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
            {row.carLabel}
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold align-middle"
              style={{ color: accent, background: agencyTint(agency?.brandColor, 0.12) }}
            >
              {row.agencyName}
            </span>
          </p>
          <p className="text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
            {row.clientName} · {formatDateShort(row.departureDate)} → {formatDateShort(row.returnDate)}
          </p>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          <p className="font-black text-sm" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
            {money(row.totalPrice)}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-faint)' }}>{row.totalDays} jours</p>
        </div>

        {expanded ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden px-5 pb-5"
        >
          <div
            className="rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs"
            style={{ background: 'var(--color-panel-2)', border: '1px solid var(--color-line-soft)' }}
          >
            <Detail label="Client" value={row.clientName} />
            <Detail label="Téléphone" value={row.clientPhone || '—'} />
            <Detail label="E-mail" value={row.clientEmail || '—'} />
            <Detail label="Lieu de retrait" value={row.pickupPointName || '—'} />
            <Detail label="Demande reçue" value={formatDateTime(row.createdAt)} />
            <Detail label="Total" value={money(row.totalPrice)} />
            <Detail
              label="Référence chez l'agence"
              value={row.remoteReservationId ? row.remoteReservationId.slice(0, 8).toUpperCase() : '—'}
            />
            <Detail label="Statut" value={sent ? 'Transmise à l’agence' : 'Échec de transmission'} />
            {row.errorMessage && (
              <div className="sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-coral)' }}>
                  Erreur
                </p>
                <p className="font-mono text-[11px] break-all" style={{ color: 'var(--color-muted)' }}>
                  {row.errorMessage}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-faint)' }}>{label}</p>
    <p className="font-semibold truncate" style={{ color: 'var(--color-title)' }}>{value}</p>
  </div>
);
