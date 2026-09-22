// ============================================================================
// Modèle de données du PORTAIL
// ----------------------------------------------------------------------------
// Deux familles de types cohabitent :
//
//   1. Les types « agence »  — lus en direct dans le Supabase de CHAQUE agence
//      partenaire (cars, agencies, services…). Ils reprennent le schéma commun
//      aux trois applications d'agence, enrichi d'un marquage d'origine
//      (`agencyKey`, `agencyName`) posé par le portail au moment de l'agrégation.
//
//   2. Les types « portail » — propres à la base du site général
//      (partner_agencies, portal_reservations, profiles…).
//
// Règle d'or : le portail ne COPIE jamais une voiture ni une réservation. Il
// lit à la volée et écrit chez l'agence propriétaire. Seule une trace
// analytique est conservée dans portal_reservations.
// ============================================================================

export type Language = 'fr' | 'ar';
export type Theme = 'dark' | 'light';

// ─── 1. AGENCE PARTENAIRE (table public.partner_agencies du portail) ────────

export interface PartnerAgency {
  id: string;
  /** Identifiant court et stable utilisé dans les URL et les filtres. */
  slug: string;
  name: string;
  city: string | null;
  /** URL du projet Supabase de l'agence, ex. https://xxx.supabase.co */
  supabaseUrl: string;
  /** Clé anon de ce projet. Publique par nature : elle est déjà servie par le
   *  propre site de l'agence. La RLS de l'agence reste la seule barrière. */
  anonKey: string;
  logoUrl: string | null;
  /** Couleur d'accent de l'agence, utilisée pour ses pastilles et ses filtres. */
  brandColor: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Version publique servie au site anonyme (sans champs de gestion). */
export interface PublicAgency {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  supabaseUrl: string;
  anonKey: string;
  logoUrl: string | null;
  brandColor: string | null;
  displayOrder: number;
}

/** État de santé d'une connexion, calculé à la volée par le portail. */
export interface AgencyHealth {
  agencyId: string;
  reachable: boolean;
  carCount: number;
  pickupPointCount: number;
  /** Message d'erreur brut lorsque `reachable` est faux. */
  error?: string;
  checkedAt: string;
}

// ─── 2. DONNÉES LUES CHEZ LES AGENCES ───────────────────────────────────────

/** Marquage d'origine ajouté à CHAQUE ligne agrégée par le portail. */
export interface AgencyStamp {
  /** id de la ligne partner_agencies — clé de routage des réservations. */
  agencyKey: string;
  agencySlug: string;
  agencyName: string;
  agencyColor: string | null;
  agencyLogo: string | null;
}

export type CarStatus = 'disponible' | 'reserve' | 'louer' | 'maintenance';

export interface Car extends AgencyStamp {
  id: string;
  brand: string;
  model: string;
  registration: string;
  year: number | null;
  color: string;
  energy: string;
  transmission: string;
  seats: number;
  doors: number;
  priceDay: number;
  priceWeek: number;
  priceMonth: number;
  deposit: number;
  image: string;
  status: CarStatus;
  isHiddenFromSite: boolean;
}

/** Point de départ / retour. Appartient TOUJOURS à une seule agence. */
export interface PickupPoint extends AgencyStamp {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
}

export interface SpecialOffer extends AgencyStamp {
  id: string;
  carId: string;
  car: Car | null;
  oldPrice: number;
  newPrice: number;
  note: string | null;
  label: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface AgencyService extends AgencyStamp {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  isMandatory: boolean;
}

export interface AssuranceItem {
  itemId: string | null;
  name: string;
  /** true = inclus dans le forfait, false = exclu (affiché barré). */
  status: boolean;
  displayOrder: number;
}

export interface ProtectionAssurance extends AgencyStamp {
  id: string;
  name: string;
  pricePerDay: number;
  items: AssuranceItem[];
}

export interface AgencyContact extends AgencyStamp {
  phone: string | null;
  email: string | null;
  address: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  description: string | null;
  logo: string | null;
}

/** Période déjà réservée pour un véhicule (calendrier de réservation). */
export interface BlockedRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

// ─── 3. TUNNEL DE RÉSERVATION ───────────────────────────────────────────────

export type DocumentType = 'none' | 'passport' | 'id_card' | 'residence_permit';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  placeOfBirth: string;
  licenseNumber: string;
  licenseExpiration: string;
  licenseDelivery: string;
  licenseDeliveryPlace: string;
  documentType: DocumentType;
  documentNumber: string;
  documentDelivery: string;
  documentExpiration: string;
  documentDeliveryAddress: string;
  wilaya: string;
  completeAddress: string;
}

export interface FlightInfo {
  number: string;
  date: string;
  time: string;
}

export interface SelectedService {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  isMandatory: boolean;
}

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

/** Critères de recherche transmis du landing au tunnel. */
export interface SearchCriteria {
  from: string;
  to: string;
  /** Filtre d'agence choisi sur le landing ('' = toutes les agences). */
  agencyKey?: string;
}

export type PromoStatus = 'idle' | 'checking' | 'valid' | 'invalid';

/** Réponse renvoyée par l'agence après création de la réservation. */
export interface ReservationResult {
  reservationId: string;
  clientId: string;
  agencyName: string;
  agencyPhone: string | null;
  agencyEmail: string | null;
  totalPrice: number;
}

// ─── 4. PORTAIL — journal, réglages, statistiques ───────────────────────────

/** Trace analytique d'une réservation passée par le portail. */
export interface PortalReservation {
  id: string;
  agencyId: string;
  agencyName: string;
  remoteReservationId: string | null;
  carLabel: string;
  carId: string | null;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  departureDate: string;
  returnDate: string;
  totalDays: number;
  totalPrice: number;
  currencyCode: string;
  pickupPointName: string | null;
  status: 'sent' | 'failed';
  errorMessage: string | null;
  createdAt: string;
}

export interface PortalSettings {
  siteName: string;
  tagline: string;
  description: string;
  heroImage: string;
  phone: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  whatsapp: string;
}

export interface PortalStats {
  totalReservations: number;
  sentReservations: number;
  failedReservations: number;
  totalRevenue: number;
  averageBasket: number;
  averageDuration: number;
  byAgency: {
    agencyId: string;
    agencyName: string;
    count: number;
    revenue: number;
  }[];
  byMonth: {
    month: string; // YYYY-MM
    count: number;
    revenue: number;
  }[];
  topCars: {
    carLabel: string;
    agencyName: string;
    count: number;
  }[];
  recent: PortalReservation[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'worker';
}

// ─── 5. DEVISES ─────────────────────────────────────────────────────────────

export interface CurrencySetting {
  code: string;
  label: string;
  symbol: string;
  /** Valeur en DZD d'UNE unité de cette devise. DZD est la base (rate = 1). */
  rateToDzd: number;
  isBase: boolean;
  displayOrder: number;
}
