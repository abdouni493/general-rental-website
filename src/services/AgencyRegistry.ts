import { supabase } from '../lib/supabase';
import { getAgencyClient, forgetAgencyClient, withTimeout } from '../lib/agencyClients';
import type { PartnerAgency, PublicAgency, AgencyHealth } from '../types';

// ============================================================================
// Registre des agences partenaires
// ----------------------------------------------------------------------------
// Source unique de vérité du routage : chaque voiture affichée sur le portail
// porte l'`agencyKey` d'une ligne de ce registre, et c'est cette ligne qui dit
// vers quel projet Supabase envoyer la réservation.
//
// Côté public, la liste est servie par la RPC `public_agencies()` : seules les
// agences actives sortent, et uniquement les champs nécessaires à la vitrine.
// Côté admin, on lit/écrit directement la table (protégée par RLS).
// ============================================================================

const mapPublic = (row: any): PublicAgency => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  city: row.city ?? null,
  supabaseUrl: row.supabase_url,
  anonKey: row.anon_key,
  logoUrl: row.logo_url ?? null,
  brandColor: row.brand_color ?? null,
  displayOrder: Number(row.display_order) || 0,
});

const mapPartner = (row: any): PartnerAgency => ({
  ...mapPublic(row),
  phone: row.phone ?? null,
  email: row.email ?? null,
  address: row.address ?? null,
  isActive: row.is_active !== false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface AgencyConnectionInput {
  name: string;
  slug: string;
  city: string;
  supabaseUrl: string;
  anonKey: string;
  logoUrl: string;
  brandColor: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
  displayOrder: number;
}

export class AgencyRegistry {
  // ─── Lecture publique (site anonyme) ──────────────────────────────────────

  /**
   * Agences actives visibles par le site public.
   * Passe par une RPC SECURITY DEFINER : la table partner_agencies reste
   * fermée à l'anon (elle contient aussi les agences désactivées et les notes
   * de gestion).
   */
  static async listPublic(): Promise<PublicAgency[]> {
    const { data, error } = await supabase.rpc('public_agencies');
    if (error) throw error;
    return (data || []).map(mapPublic).sort((a: PublicAgency, b: PublicAgency) =>
      a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
  }

  // ─── Lecture / écriture admin ─────────────────────────────────────────────

  static async listAll(): Promise<PartnerAgency[]> {
    const { data, error } = await supabase
      .from('partner_agencies')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(mapPartner);
  }

  static async create(input: AgencyConnectionInput): Promise<PartnerAgency> {
    const { data, error } = await supabase
      .from('partner_agencies')
      .insert([toRow(input)])
      .select()
      .single();
    if (error) throw error;
    return mapPartner(data);
  }

  static async update(id: string, input: Partial<AgencyConnectionInput>): Promise<PartnerAgency> {
    const previous = await this.findById(id);
    const { data, error } = await supabase
      .from('partner_agencies')
      .update({ ...toRow(input as AgencyConnectionInput, true), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    // L'ancien client pointe peut-être sur une URL/clé périmée.
    if (previous) forgetAgencyClient(previous);
    return mapPartner(data);
  }

  static async remove(id: string): Promise<void> {
    const previous = await this.findById(id);
    const { error } = await supabase.from('partner_agencies').delete().eq('id', id);
    if (error) throw error;
    if (previous) forgetAgencyClient(previous);
  }

  static async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('partner_agencies')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  private static async findById(id: string): Promise<PartnerAgency | null> {
    const { data } = await supabase.from('partner_agencies').select('*').eq('id', id).maybeSingle();
    return data ? mapPartner(data) : null;
  }

  // ─── Diagnostic de connexion ──────────────────────────────────────────────

  /**
   * Vérifie qu'une agence répond et qu'elle expose bien ce dont le portail a
   * besoin : la table `cars`, la table `agencies` (lieux de départ) et la RPC
   * `create_website_reservation`. Utilisé par le bouton « Tester » et au
   * moment de créer une connexion.
   */
  static async testConnection(
    connection: Pick<PublicAgency, 'supabaseUrl' | 'anonKey' | 'name'> & { id?: string },
  ): Promise<AgencyHealth> {
    const checkedAt = new Date().toISOString();
    const base: AgencyHealth = {
      agencyId: connection.id || '',
      reachable: false,
      carCount: 0,
      pickupPointCount: 0,
      checkedAt,
    };

    let client;
    try {
      client = getAgencyClient(connection);
    } catch (err: any) {
      return { ...base, error: "URL ou clé anon manquante." };
    }

    try {
      // Pas de filtre sur `is_hidden_from_site` : la colonne manque dans
      // certaines bases d'agence et la requête échouerait (42703). On compte
      // donc la flotte entière — c'est la mesure qui nous intéresse ici, le
      // masquage étant une décision d'affichage.
      const carsQuery = client.from('cars').select('id', { count: 'exact', head: true });
      const pointsQuery = client.from('agencies').select('id', { count: 'exact', head: true });

      const [cars, points] = await withTimeout(Promise.all([carsQuery, pointsQuery]), 15_000);

      if (cars.error) {
        return { ...base, error: `Lecture de « cars » refusée : ${cars.error.message}` };
      }
      if (points.error) {
        return {
          ...base,
          reachable: true,
          carCount: cars.count || 0,
          error: `Lecture de « agencies » refusée : ${points.error.message}`,
        };
      }

      // La RPC de création est le seul point d'écriture : on vérifie qu'elle
      // existe SANS jamais créer de réservation.
      //
      // Le sondage envoie des objets vides. Selon la version déployée chez
      // l'agence, la fonction s'arrête soit sur son garde-fou
      // (INVALID_RESERVATION_DATA), soit plus loin sur la contrainte NOT NULL
      // de `clients.first_name`. Dans les deux cas l'exception avorte la
      // transaction ouverte par PostgREST pour cet appel : rien n'est écrit.
      // Une fonction ABSENTE, elle, répond PGRST202 — c'est ce qui distingue
      // les deux situations.
      const probe = await withTimeout(
        client.rpc('create_website_reservation', {
          p_client: {},
          p_reservation: {},
          p_services: [],
          p_promo_code: null,
        }),
        15_000,
      );

      const probeMessage = probe.error?.message || '';
      const rpcMissing =
        probe.error?.code === 'PGRST202' ||
        /could not find the function|does not exist/i.test(probeMessage);

      if (rpcMissing) {
        return {
          ...base,
          reachable: true,
          carCount: cars.count || 0,
          pickupPointCount: points.count || 0,
          error:
            "La fonction create_website_reservation est absente : exécutez le script SQL côté agence.",
        };
      }

      return {
        ...base,
        reachable: true,
        carCount: cars.count || 0,
        pickupPointCount: points.count || 0,
      };
    } catch (err: any) {
      const message = err?.message === 'TIMEOUT'
        ? "Aucune réponse (projet en pause ou URL incorrecte)."
        : err?.message || 'Connexion impossible.';
      return { ...base, error: message };
    }
  }

  static async testAll(agencies: PartnerAgency[]): Promise<Record<string, AgencyHealth>> {
    const results = await Promise.all(
      agencies.map(a => this.testConnection({ ...a, id: a.id })),
    );
    return Object.fromEntries(results.map((health, i) => [agencies[i].id, health]));
  }
}

/** Formulaire admin → ligne de table. `partial` ignore les champs absents. */
function toRow(input: AgencyConnectionInput, partial = false): Record<string, any> {
  const row: Record<string, any> = {
    name: input.name?.trim(),
    slug: input.slug?.trim().toLowerCase(),
    city: input.city?.trim() || null,
    supabase_url: input.supabaseUrl?.trim().replace(/\/+$/, ''),
    anon_key: input.anonKey?.trim(),
    logo_url: input.logoUrl?.trim() || null,
    brand_color: input.brandColor?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    address: input.address?.trim() || null,
    is_active: input.isActive,
    display_order: Number(input.displayOrder) || 0,
  };
  if (partial) {
    Object.keys(row).forEach(k => {
      if (row[k] === undefined) delete row[k];
    });
  }
  return row;
}
