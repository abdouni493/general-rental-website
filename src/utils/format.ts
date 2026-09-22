import type { Language, SpecialOffer } from '../types';

// ============================================================================
// Formatage & petites règles d'affichage partagées
// ============================================================================

/** Montant en dinars, groupé par milliers, sans décimale. */
export function money(amount: number, lang: Language = 'fr'): string {
  const value = Math.round(Number(amount) || 0);
  const grouped = value.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-FR');
  return lang === 'ar' ? `${grouped} د.ج` : `${grouped} DA`;
}

/** Version compacte pour les tuiles de statistiques (12 500 000 → 12,5 M). */
export function moneyCompact(amount: number): string {
  const value = Math.round(Number(amount) || 0);
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} M DA`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 1000)} k DA`;
  return `${value.toLocaleString('fr-FR')} DA`;
}

export function initials(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?';
}

/** Identifiant court, stable et sûr en URL, dérivé d'un nom d'agence. */
export function slugify(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Offre spéciale ACTIVE d'un véhicule à la date du jour.
 * Une offre sans bornes est considérée permanente ; une offre bornée n'est
 * retenue que dans sa fenêtre. La plus récente gagne si plusieurs s'appliquent.
 */
export function currentOfferForCar(carId: string, offers: SpecialOffer[]): SpecialOffer | undefined {
  const now = new Date().toISOString().slice(0, 10);
  return offers.find(o => {
    if (o.carId !== carId || !o.isActive) return false;
    if (o.startDate && now < o.startDate) return false;
    if (o.endDate && now > o.endDate) return false;
    return o.newPrice > 0 && o.newPrice < o.oldPrice;
  });
}

export function discountPercent(offer: SpecialOffer): number {
  if (!offer.oldPrice) return 0;
  return Math.round((1 - offer.newPrice / offer.oldPrice) * 100);
}

/** Couleur d'accent d'une agence, avec repli sur le violet du portail. */
export function agencyColor(color: string | null | undefined): string {
  return color && /^#[0-9a-f]{3,8}$/i.test(color) ? color : 'var(--color-iris)';
}

/** Même couleur, en version translucide pour les fonds de pastille. */
export function agencyTint(color: string | null | undefined, alpha = 0.14): string {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return 'var(--color-iris-soft)';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const WILAYAS = [
  '01 - Adrar', '02 - Chlef', '03 - Laghouat', '04 - Oum El Bouaghi', '05 - Batna',
  '06 - Béjaïa', '07 - Biskra', '08 - Béchar', '09 - Blida', '10 - Bouira',
  '11 - Tamanrasset', '12 - Tébessa', '13 - Tlemcen', '14 - Tiaret', '15 - Tizi Ouzou',
  '16 - Alger', '17 - Djelfa', '18 - Jijel', '19 - Sétif', '20 - Saïda',
  '21 - Skikda', '22 - Sidi Bel Abbès', '23 - Annaba', '24 - Guelma', '25 - Constantine',
  '26 - Médéa', '27 - Mostaganem', '28 - MSila', '29 - Mascara', '30 - Ouargla',
  '31 - Oran', '32 - El Bayadh', '33 - Illizi', '34 - Bordj Bou Arreridj', '35 - Boumerdès',
  '36 - El Tarf', '37 - Tindouf', '38 - Tissemsilt', '39 - El Oued', '40 - Khenchela',
  '41 - Souk Ahras', '42 - Tipaza', '43 - Mila', '44 - Aïn Defla', '45 - Naâma',
  '46 - Aïn Témouchent', '47 - Ghardaïa', '48 - Relizane', '49 - Timimoun',
  '50 - Bordj Badji Mokhtar', '51 - Ouled Djellal', '52 - Béni Abbès', '53 - In Salah',
  '54 - In Guezzam', '55 - Touggourt', '56 - Djanet', '57 - El MGhair', '58 - El Meniaa',
];

/** Créneaux horaires proposés pour le départ et le retour. */
export const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => {
  const minutes = 7 * 60 + i * 30; // 07:00 → 21:00
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
});
