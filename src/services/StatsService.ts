import { supabase } from '../lib/supabase';
import type { PortalReservation, PortalStats } from '../types';

// ============================================================================
// StatsService — statistiques des réservations passées par le portail
// ----------------------------------------------------------------------------
// Le portail ne connaît QUE les réservations qu'il a lui-même émises : celles
// que les agences reçoivent en direct sur leur propre site n'apparaissent pas
// ici, et c'est voulu. La page « Statistiques » mesure l'apport du portail.
//
// L'agrégation est faite côté client sur le journal filtré : le volume reste
// modeste (une ligne par réservation) et cela évite d'empiler des vues SQL
// figées.
// ============================================================================

const mapLog = (row: any): PortalReservation => ({
  id: row.id,
  agencyId: row.agency_id,
  agencyName: row.agency_name || '—',
  remoteReservationId: row.remote_reservation_id ?? null,
  carLabel: row.car_label || '—',
  carId: row.car_id ?? null,
  clientName: row.client_name || '—',
  clientPhone: row.client_phone ?? null,
  clientEmail: row.client_email ?? null,
  departureDate: row.departure_date,
  returnDate: row.return_date,
  totalDays: Number(row.total_days) || 0,
  totalPrice: Number(row.total_price) || 0,
  currencyCode: row.currency_code || 'DZD',
  pickupPointName: row.pickup_point_name ?? null,
  status: row.status === 'failed' ? 'failed' : 'sent',
  errorMessage: row.error_message ?? null,
  createdAt: row.created_at,
});

export interface StatsFilter {
  /** Bornes inclusives sur la date de CRÉATION de la réservation. */
  from?: string;   // YYYY-MM-DD
  to?: string;     // YYYY-MM-DD
  agencyId?: string;
}

export class StatsService {
  static async listReservations(filter: StatsFilter = {}): Promise<PortalReservation[]> {
    let query = supabase
      .from('portal_reservations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (filter.from) query = query.gte('created_at', `${filter.from}T00:00:00Z`);
    if (filter.to) query = query.lte('created_at', `${filter.to}T23:59:59Z`);
    if (filter.agencyId) query = query.eq('agency_id', filter.agencyId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapLog);
  }

  static async getStats(filter: StatsFilter = {}): Promise<PortalStats> {
    const rows = await this.listReservations(filter);
    return computeStats(rows);
  }

  static async deleteReservationLog(id: string): Promise<void> {
    const { error } = await supabase.from('portal_reservations').delete().eq('id', id);
    if (error) throw error;
  }
}

export function computeStats(rows: PortalReservation[]): PortalStats {
  const sent = rows.filter(r => r.status === 'sent');
  const failed = rows.filter(r => r.status === 'failed');

  const totalRevenue = sent.reduce((sum, r) => sum + r.totalPrice, 0);
  const totalDays = sent.reduce((sum, r) => sum + r.totalDays, 0);

  // ── Par agence ────────────────────────────────────────────────────────────
  const agencyMap = new Map<string, { agencyId: string; agencyName: string; count: number; revenue: number }>();
  for (const r of sent) {
    const entry = agencyMap.get(r.agencyId) || {
      agencyId: r.agencyId, agencyName: r.agencyName, count: 0, revenue: 0,
    };
    entry.count += 1;
    entry.revenue += r.totalPrice;
    agencyMap.set(r.agencyId, entry);
  }

  // ── Par mois (12 derniers mois glissants, zéros compris) ─────────────────
  const monthMap = new Map<string, { month: string; count: number; revenue: number }>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, { month: key, count: 0, revenue: 0 });
  }
  for (const r of sent) {
    const key = r.createdAt.slice(0, 7);
    const entry = monthMap.get(key);
    if (entry) {
      entry.count += 1;
      entry.revenue += r.totalPrice;
    }
  }

  // ── Véhicules les plus demandés ───────────────────────────────────────────
  const carMap = new Map<string, { carLabel: string; agencyName: string; count: number }>();
  for (const r of sent) {
    const key = `${r.agencyId}::${r.carLabel}`;
    const entry = carMap.get(key) || { carLabel: r.carLabel, agencyName: r.agencyName, count: 0 };
    entry.count += 1;
    carMap.set(key, entry);
  }

  return {
    totalReservations: rows.length,
    sentReservations: sent.length,
    failedReservations: failed.length,
    totalRevenue,
    averageBasket: sent.length ? Math.round(totalRevenue / sent.length) : 0,
    averageDuration: sent.length ? Math.round((totalDays / sent.length) * 10) / 10 : 0,
    byAgency: [...agencyMap.values()].sort((a, b) => b.count - a.count),
    byMonth: [...monthMap.values()],
    topCars: [...carMap.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    recent: rows.slice(0, 40),
  };
}
