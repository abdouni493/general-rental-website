// ============================================================================
// Dates — tout le portail manipule des chaînes YYYY-MM-DD
// ----------------------------------------------------------------------------
// Aucune conversion UTC n'est faite : une location du 12 au 15 doit rester le
// 12 au 15 quel que soit le fuseau du navigateur. On construit donc les objets
// Date à midi, ce qui met le changement d'heure et les décalages hors de
// portée.
// ============================================================================

export function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export const today = (): string => toYmd(new Date());

export function addDays(ymd: string, days: number): string {
  const date = fromYmd(ymd);
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

/** Nombre de jours facturés : au moins 1, borne de retour incluse au départ. */
export function daysBetween(from?: string, to?: string): number {
  if (!from || !to) return 0;
  const diff = Math.ceil((fromYmd(to).getTime() - fromYmd(from).getTime()) / 86_400_000);
  return Math.max(1, diff);
}

/** Deux intervalles [aFrom, aTo] et [bFrom, bTo] se chevauchent-ils ? */
export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && aTo >= bFrom;
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const MONTHS_AR = [
  'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
  'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const MONTH_LABELS = { fr: MONTHS_FR, ar: MONTHS_AR };

export const WEEKDAY_LABELS = {
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  ar: ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'],
};

export function formatDate(ymd: string, lang: 'fr' | 'ar' = 'fr'): string {
  if (!ymd) return '—';
  const date = fromYmd(ymd);
  const month = MONTH_LABELS[lang][date.getMonth()];
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

export function formatDateShort(ymd: string): string {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string, lang: 'fr' | 'ar' = 'fr'): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const month = MONTH_LABELS[lang][date.getMonth()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${month} ${date.getFullYear()} · ${hh}:${mm}`;
}

/** Libellé court d'un mois « YYYY-MM » pour les graphiques. */
export function formatMonthKey(key: string, lang: 'fr' | 'ar' = 'fr'): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_LABELS[lang][(m || 1) - 1].slice(0, 4)} ${String(y).slice(2)}`;
}

/** Grille du mois affiché : cases vides au début, jours ensuite. */
export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // getDay() : 0 = dimanche. On veut lundi en première colonne.
  const offset = (first.getDay() + 6) % 7;

  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toYmd(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
