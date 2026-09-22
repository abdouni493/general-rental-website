import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Building2, CalendarCheck, TrendingUp, Car as CarIcon, ArrowRight,
  ExternalLink, AlertTriangle, Plus, Activity, CheckCircle2, XCircle,
} from 'lucide-react';

import { AgencyRegistry } from '../../services/AgencyRegistry';
import { StatsService } from '../../services/StatsService';
import { FleetService } from '../../services/FleetService';
import { StatTile, PageLoader, ErrorBanner, EmptyState } from '../ui/Primitives';
import { useAdminAuth } from './AdminAuthContext';
import { moneyCompact, money, agencyColor, agencyTint } from '../../utils/format';
import { formatDateTime, formatDateShort } from '../../utils/dates';
import type { PartnerAgency, PortalStats, AgencyHealth } from '../../types';

// ============================================================================
// Tableau de bord — la photo d'ensemble du portail au moment où l'on ouvre
// l'espace d'administration.
// ============================================================================

export const AdminDashboard: React.FC = () => {
  const { user } = useAdminAuth();
  const [agencies, setAgencies] = useState<PartnerAgency[]>([]);
  const [health, setHealth] = useState<Record<string, AgencyHealth>>({});
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [carCount, setCarCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [list, portalStats] = await Promise.all([
          AgencyRegistry.listAll(),
          StatsService.getStats().catch(() => null),
        ]);
        if (cancelled) return;

        setAgencies(list);
        if (portalStats) setStats(portalStats);
        setLoading(false);

        // Le diagnostic et le comptage de la flotte arrivent ensuite : ils
        // interrogent N bases distantes et ne doivent pas retarder l'écran.
        const active = list.filter(a => a.isActive);
        if (active.length) {
          AgencyRegistry.testAll(active).then(h => { if (!cancelled) setHealth(h); });
          FleetService.getAllCars(active).then(cars => { if (!cancelled) setCarCount(cars.length); });
        } else {
          setCarCount(0);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message?.includes('permission') || err?.code === '42501'
              ? "Accès refusé aux tables du portail. Exécutez le script SQL sql/01_portail.sql dans le projet Supabase du site général."
              : err?.message || 'Chargement impossible.',
          );
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageLoader label="Chargement du tableau de bord…" />;

  const activeAgencies = agencies.filter(a => a.isActive);
  const unreachable = Object.values(health).filter(h => !h.reachable);

  return (
    <div className="max-w-6xl">
      {/* ── Accueil ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1
            className="font-black text-2xl sm:text-3xl leading-tight"
            style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
          >
            Bonjour {user?.username?.split(' ')[0] || ''} 👋
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--color-muted)' }}>
            Voici l'état du portail et des agences qui y sont raccordées.
          </p>
        </div>

        <a href="/" target="_blank" rel="noopener noreferrer" className="btn-ghost h-11 px-5 text-xs">
          <ExternalLink size={14} /> Ouvrir le site public
        </a>
      </div>

      {error && <div className="mb-6"><ErrorBanner message={error} /></div>}

      {/* ── Tuiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        <StatTile
          label="Agences actives"
          value={`${activeAgencies.length}`}
          hint={agencies.length > activeAgencies.length ? `${agencies.length - activeAgencies.length} désactivée(s)` : 'toutes connectées'}
          icon={Building2}
          accent="var(--color-iris)"
          delay={0}
        />
        <StatTile
          label="Véhicules en ligne"
          value={carCount === null ? '…' : `${carCount}`}
          hint="agrégés depuis les agences"
          icon={CarIcon}
          accent="var(--color-aqua)"
          delay={0.07}
        />
        <StatTile
          label="Réservations transmises"
          value={`${stats?.sentReservations ?? 0}`}
          hint={stats?.failedReservations ? `${stats.failedReservations} en échec` : 'aucun échec'}
          icon={CalendarCheck}
          accent="var(--color-mint)"
          delay={0.14}
        />
        <StatTile
          label="Volume généré"
          value={stats ? moneyCompact(stats.totalRevenue) : '—'}
          hint={stats?.averageBasket ? `panier moyen ${money(stats.averageBasket)}` : 'via le portail'}
          icon={TrendingUp}
          accent="var(--color-magenta)"
          delay={0.21}
        />
      </div>

      {/* ── Alerte de connexion ── */}
      {unreachable.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-7 flex items-start gap-3"
          style={{ background: 'rgba(176,123,18,0.08)', border: '1px solid rgba(176,123,18,0.28)' }}
        >
          <AlertTriangle size={18} style={{ color: 'var(--color-amber)' }} className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
              {unreachable.length} agence{unreachable.length > 1 ? 's' : ''} injoignable{unreachable.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
              Leurs véhicules n'apparaissent pas sur le site. Les autres agences continuent de fonctionner normalement.
            </p>
          </div>
          <Link to="/admin/agences" className="btn-ghost h-10 px-4 text-xs shrink-0">
            Diagnostiquer <ArrowRight size={13} />
          </Link>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6">
        {/* ── Agences ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-black text-lg flex items-center gap-2"
              style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
            >
              <Building2 size={18} style={{ color: 'var(--color-iris)' }} /> Agences connectées
            </h2>
            <Link to="/admin/agences" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: 'var(--color-iris)' }}>
              Gérer <ArrowRight size={12} />
            </Link>
          </div>

          {agencies.length === 0 ? (
            <div className="glass-strong rounded-2xl">
              <EmptyState
                icon={Building2}
                title="Aucune agence"
                description="Connectez une agence pour peupler le portail."
                action={
                  <Link to="/admin/agences" className="btn-aurora h-11 px-5 text-xs mt-2">
                    <Plus size={14} /> Connecter une agence
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {agencies.map((agency, i) => {
                const status = health[agency.id];
                const accent = agencyColor(agency.brandColor);
                const revenue = stats?.byAgency.find(a => a.agencyId === agency.id);

                return (
                  <motion.div
                    key={agency.id}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }}
                    className="glass-strong rounded-2xl p-4 flex items-center gap-3.5"
                    style={{ opacity: agency.isActive ? 1 : 0.6 }}
                  >
                    {agency.logoUrl ? (
                      <img src={agency.logoUrl} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white shrink-0"
                        style={{ background: accent, fontFamily: 'var(--font-display)' }}
                      >
                        {agency.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                        {agency.name}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
                        {!agency.isActive
                          ? 'Désactivée'
                          : status
                            ? status.reachable
                              ? `${status.carCount} véhicules · ${status.pickupPointCount} lieux`
                              : 'Injoignable'
                            : 'Vérification…'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {revenue ? (
                        <>
                          <p className="font-black text-sm" style={{ color: accent, fontFamily: 'var(--font-display)' }}>
                            {revenue.count}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--color-faint)' }}>réservations</p>
                        </>
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{
                            background: !agency.isActive
                              ? 'var(--color-faint)'
                              : status?.reachable
                                ? 'var(--color-mint)'
                                : status
                                  ? 'var(--color-coral)'
                                  : 'var(--color-amber)',
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Dernières réservations ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-black text-lg flex items-center gap-2"
              style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}
            >
              <Activity size={18} style={{ color: 'var(--color-aqua)' }} /> Dernières demandes
            </h2>
            <Link to="/admin/statistiques" className="text-xs font-bold inline-flex items-center gap-1" style={{ color: 'var(--color-iris)' }}>
              Tout voir <ArrowRight size={12} />
            </Link>
          </div>

          {!stats || stats.recent.length === 0 ? (
            <div className="glass-strong rounded-2xl">
              <EmptyState
                icon={CalendarCheck}
                title="Aucune réservation"
                description="Les demandes passées depuis le portail apparaîtront ici, avec l'agence à laquelle elles ont été transmises."
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recent.slice(0, 7).map((row, i) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                  className="glass-strong rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                        {row.carLabel}
                      </p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--color-muted)' }}>
                        {row.clientName} · {row.agencyName}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--color-faint)' }}>
                        {formatDateShort(row.departureDate)} → {formatDateShort(row.returnDate)} · {row.totalDays} j
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-sm" style={{ color: 'var(--color-title)', fontFamily: 'var(--font-display)' }}>
                        {money(row.totalPrice)}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold mt-1"
                        style={{ color: row.status === 'sent' ? 'var(--color-mint)' : 'var(--color-coral)' }}
                      >
                        {row.status === 'sent' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {row.status === 'sent' ? 'Transmise' : 'Échec'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
