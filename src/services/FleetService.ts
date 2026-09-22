import { getAgencyClient, safeAgencyCall } from '../lib/agencyClients';
import type {
  PublicAgency, Car, PickupPoint, SpecialOffer, AgencyService,
  ProtectionAssurance, AgencyContact, AgencyStamp, BlockedRange,
} from '../types';

// ============================================================================
// FleetService — agrégation multi-agences
// ----------------------------------------------------------------------------
// Toutes les lectures de la vitrine passent par ici. Le principe est toujours
// le même : lancer la même requête sur les N bases d'agences EN PARALLÈLE,
// estampiller chaque ligne avec son agence d'origine, puis concaténer.
//
// Une agence injoignable (projet en pause, clé révoquée, table absente) rend
// un tableau vide et n'interrompt jamais les autres : `safeAgencyCall` avale
// l'erreur et la journalise en console.
//
// Les colonnes lues sont l'INTERSECTION des trois schémas d'agence observés :
//   • SZ Cars   : agency_daily_share / currency_config
//   • iCar      : agency_share_per_day / currencies
//   • MHD Auto  : agency_share_per_day / currencies + company_id
// On sélectionne donc `*` et on mappe défensivement plutôt que d'énumérer des
// colonnes qui n'existent pas partout.
// ============================================================================

const stampOf = (agency: PublicAgency): AgencyStamp => ({
  agencyKey: agency.id,
  agencySlug: agency.slug,
  agencyName: agency.name,
  agencyColor: agency.brandColor,
  agencyLogo: agency.logoUrl,
});

const PLACEHOLDER_CAR_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="#1F2450"/><stop offset="1" stop-color="#10132A"/>
       </linearGradient></defs>
       <rect width="400" height="300" fill="url(#g)"/>
       <path d="M80 180h240l-24-46a24 24 0 0 0-21-13H125a24 24 0 0 0-21 13z" fill="#7C5CFF" opacity="0.35"/>
       <circle cx="130" cy="192" r="18" fill="#22D3EE" opacity="0.5"/>
       <circle cx="270" cy="192" r="18" fill="#22D3EE" opacity="0.5"/>
     </svg>`,
  );

function mapCar(row: any, agency: PublicAgency): Car {
  const perDay = Math.round(Number(row.price_per_day) || 0);
  return {
    ...stampOf(agency),
    id: row.id,
    brand: row.brand || '',
    model: row.model || '',
    registration: row.plate_number || '',
    year: row.year ?? null,
    color: row.color || '—',
    energy: row.energy || 'Essence',
    transmission: row.transmission || 'Manuelle',
    seats: Number(row.seats) || 5,
    doors: Number(row.doors) || 4,
    priceDay: perDay,
    priceWeek: Math.round(Number(row.price_week) || perDay),
    priceMonth: Math.round(Number(row.price_month) || perDay),
    deposit: Math.round(Number(row.deposit) || perDay * 2),
    image: row.image_url || PLACEHOLDER_CAR_IMAGE,
    status: row.status === 'maintenance' ? 'maintenance' : 'disponible',
    isHiddenFromSite: row.is_hidden_from_site === true,
  };
}

export class FleetService {
  // ─── Flotte ───────────────────────────────────────────────────────────────

  /**
   * Toutes les voitures visibles de toutes les agences actives.
   * Les véhicules masqués du site et ceux en maintenance sont écartés : un
   * client ne doit jamais voir une voiture qu'il ne peut pas réserver.
   */
  static async getAllCars(agencies: PublicAgency[]): Promise<Car[]> {
    const batches = await Promise.all(
      agencies.map(agency =>
        safeAgencyCall<Car[]>('cars', agency.name, async () => {
          const client = getAgencyClient(agency);
          // `select('*')` sans filtre serveur, volontairement : la colonne
          // `is_hidden_from_site` manque dans certaines bases d'agence (elle
          // a été ajoutée par une migration que toutes n'ont pas jouée). Un
          // `.eq()` dessus renverrait 42703 et ferait disparaître TOUTE la
          // flotte de cette agence. Le tri se fait donc côté client, où une
          // colonne absente vaut simplement « non masquée ».
          const { data, error } = await client
            .from('cars')
            .select('*')
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || [])
            .map(row => mapCar(row, agency))
            .filter(car => !car.isHiddenFromSite && car.status !== 'maintenance' && car.priceDay > 0);
        }, []),
      ),
    );
    return batches.flat();
  }

  // ─── Lieux de départ / retour ─────────────────────────────────────────────

  /**
   * Points de retrait de TOUTES les agences, chacun estampillé de son agence.
   * L'étape « Lieu de départ » du tunnel filtre ensuite sur `agencyKey` pour
   * ne proposer que les points de l'agence propriétaire du véhicule choisi —
   * c'est la règle métier centrale du portail.
   */
  static async getAllPickupPoints(agencies: PublicAgency[]): Promise<PickupPoint[]> {
    const batches = await Promise.all(
      agencies.map(agency =>
        safeAgencyCall<PickupPoint[]>('agencies', agency.name, async () => {
          const client = getAgencyClient(agency);
          const { data, error } = await client
            .from('agencies')
            .select('*')
            .order('created_at', { ascending: true });
          if (error) throw error;
          return (data || []).map((row: any) => ({
            ...stampOf(agency),
            id: row.id,
            name: row.name || '',
            address: row.address ?? null,
            city: row.city ?? null,
          }));
        }, []),
      ),
    );
    return batches.flat();
  }

  /** Points de retrait d'UNE agence — utilisé après le choix du véhicule. */
  static async getPickupPointsFor(agency: PublicAgency): Promise<PickupPoint[]> {
    return this.getAllPickupPoints([agency]);
  }

  // ─── Offres spéciales ─────────────────────────────────────────────────────

  static async getAllSpecialOffers(agencies: PublicAgency[]): Promise<SpecialOffer[]> {
    const batches = await Promise.all(
      agencies.map(agency =>
        safeAgencyCall<SpecialOffer[]>('special_offers', agency.name, async () => {
          const client = getAgencyClient(agency);
          const { data, error } = await client
            .from('special_offers')
            .select('*, car:cars(*)')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || [])
            // Une promo sur un véhicule masqué du site n'a rien à y faire.
            .filter((row: any) => row.car && row.car.is_hidden_from_site !== true)
            .map((row: any) => ({
              ...stampOf(agency),
              id: row.id,
              carId: row.car_id,
              car: row.car ? mapCar(row.car, agency) : null,
              oldPrice: Math.round(Number(row.old_price) || 0),
              newPrice: Math.round(Number(row.new_price) || 0),
              note: row.note ?? null,
              label: row.label ?? null,
              isActive: row.is_active !== false,
              startDate: row.start_date ?? null,
              endDate: row.end_date ?? null,
            }));
        }, []),
      ),
    );
    return batches.flat();
  }

  // ─── Catalogue de services / assurances d'UNE agence ──────────────────────
  // Ces éléments sont propres à chaque agence : ils ne sont chargés qu'une
  // fois le véhicule choisi, pour l'agence qui le possède.

  static async getServicesFor(agency: PublicAgency): Promise<AgencyService[]> {
    return safeAgencyCall<AgencyService[]>('services', agency.name, async () => {
      const client = getAgencyClient(agency);
      const { data, error } = await client
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...stampOf(agency),
        id: row.id,
        category: row.category || 'service',
        name: row.service_name || '',
        description: row.description ?? null,
        price: Math.round(Number(row.price) || 0),
        isMandatory: row.is_mandatory === true,
      }));
    }, []);
  }

  static async getAssurancesFor(agency: PublicAgency): Promise<ProtectionAssurance[]> {
    return safeAgencyCall<ProtectionAssurance[]>('protection_assurances', agency.name, async () => {
      const client = getAgencyClient(agency);
      const { data, error } = await client
        .from('protection_assurances')
        .select(`
          *,
          protection_assurance_item_links(
            id, status,
            item:protection_assurance_items(id, item_name, display_order)
          )
        `)
        .eq('is_active', true)
        .order('price_per_day', { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...stampOf(agency),
        id: row.id,
        name: row.name || '',
        pricePerDay: Math.round(Number(row.price_per_day) || 0),
        items: (row.protection_assurance_item_links || [])
          .map((link: any) => ({
            itemId: link.item?.id ?? null,
            name: link.item?.item_name || '',
            status: !!link.status,
            displayOrder: link.item?.display_order ?? 0,
          }))
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder),
      }));
    }, []);
  }

  // ─── Coordonnées publiques de chaque agence (page Contacts) ───────────────

  static async getAllContacts(agencies: PublicAgency[]): Promise<AgencyContact[]> {
    const batches = await Promise.all(
      agencies.map(agency =>
        safeAgencyCall<AgencyContact[]>('website_contacts', agency.name, async () => {
          const client = getAgencyClient(agency);
          const [contacts, settings] = await Promise.all([
            client.from('website_contacts').select('*').limit(1),
            client.from('website_settings').select('*').limit(1),
          ]);
          const c = contacts.data?.[0] || {};
          const s = settings.data?.[0] || {};
          return [{
            ...stampOf(agency),
            phone: c.phone || s.phone || null,
            email: c.email || s.email || null,
            address: c.address || s.address || null,
            facebook: c.facebook || null,
            instagram: c.instagram || null,
            tiktok: c.tiktok || null,
            whatsapp: c.whatsapp || null,
            description: s.description || null,
            logo: s.logo || null,
          }];
        }, []),
      ),
    );
    return batches.flat();
  }

  // ─── Disponibilité ────────────────────────────────────────────────────────

  /**
   * Identifiants des voitures INDISPONIBLES sur une période, toutes agences
   * confondues. Les ids d'agences différentes ne peuvent pas entrer en
   * collision (uuid), on peut donc les fusionner dans un seul ensemble.
   *
   * Si une agence n'expose pas la RPC, elle est simplement absente du résultat
   * — au pire on propose une voiture qui sera refusée à la création, où la
   * vérification serveur fait autorité.
   */
  static async getUnavailableCarIds(
    agencies: PublicAgency[], from: string, to: string,
  ): Promise<Set<string>> {
    const batches = await Promise.all(
      agencies.map(agency =>
        safeAgencyCall<string[]>('get_unavailable_car_ids', agency.name, async () => {
          const client = getAgencyClient(agency);
          const { data, error } = await client.rpc('get_unavailable_car_ids', {
            p_from: from, p_to: to,
          });
          if (error) throw error;
          // La RPC renvoie SETOF uuid → tableau de chaînes ou d'objets selon
          // la version de PostgREST.
          return (data || []).map((v: any) => (typeof v === 'string' ? v : v?.get_unavailable_car_ids)).filter(Boolean);
        }, []),
      ),
    );
    return new Set(batches.flat());
  }

  /** Périodes déjà réservées pour UN véhicule (calendrier du tunnel). */
  static async getBlockedRanges(agency: PublicAgency, carId: string): Promise<BlockedRange[]> {
    return safeAgencyCall<BlockedRange[]>('get_reserved_periods', agency.name, async () => {
      const client = getAgencyClient(agency);
      const { data, error } = await client.rpc('get_reserved_periods', { p_car_id: carId });
      if (error) throw error;
      return (data || [])
        .map((row: any) => ({
          from: String(row.departure_date || '').slice(0, 10),
          to: String(row.return_date || '').slice(0, 10),
        }))
        .filter((r: BlockedRange) => r.from && r.to);
    }, []);
  }
}
