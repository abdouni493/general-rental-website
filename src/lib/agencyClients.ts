import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PublicAgency } from '../types';

// ============================================================================
// Pool de clients Supabase — un par agence partenaire
// ----------------------------------------------------------------------------
// Le portail parle à N bases différentes. Chaque agence garde SA base : rien
// n'est répliqué. Un client est créé à la première utilisation puis conservé
// (créer un client Supabase installe des écouteurs, on n'en veut qu'un seul
// par projet).
//
// Les clés utilisées sont les clés `anon` — les mêmes que celles déjà servies
// par le site public de chaque agence. La RLS côté agence reste la seule
// barrière : lecture des tables vitrine, écriture uniquement par les RPC
// SECURITY DEFINER (create_website_reservation).
// ============================================================================

const pool = new Map<string, SupabaseClient>();

/** Clé de cache : deux agences peuvent viser le même projet avec des clés
 *  différentes, on distingue donc sur URL + clé. */
const cacheKey = (url: string, anonKey: string) => `${url}::${anonKey.slice(-24)}`;

export function getAgencyClient(agency: Pick<PublicAgency, 'supabaseUrl' | 'anonKey'>): SupabaseClient {
  const url = (agency.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = (agency.anonKey || '').trim();

  if (!url || !key) {
    throw new Error('AGENCY_CONNECTION_INCOMPLETE');
  }

  const id = cacheKey(url, key);
  const existing = pool.get(id);
  if (existing) return existing;

  const client = createClient(url, key, {
    auth: {
      // Aucune session n'est ouverte chez une agence : le portail y est
      // toujours anonyme. Persister quoi que ce soit écraserait la session
      // admin du portail dans localStorage.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { 'x-portal-origin': 'drivehub' },
    },
  });

  pool.set(id, client);
  return client;
}

/** Retire un client du pool (après modification d'une connexion en admin). */
export function forgetAgencyClient(agency: Pick<PublicAgency, 'supabaseUrl' | 'anonKey'>): void {
  const url = (agency.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = (agency.anonKey || '').trim();
  pool.delete(cacheKey(url, key));
}

export function clearAgencyClients(): void {
  pool.clear();
}

/**
 * Exécute une lecture chez une agence en la rendant NON BLOQUANTE : si le
 * projet est en pause, supprimé ou injoignable, le portail continue avec les
 * autres agences au lieu de tomber en erreur.
 *
 * C'est la pièce centrale de la robustesse du site : une agence absente ne
 * doit jamais vider la vitrine des autres.
 */
export async function safeAgencyCall<T>(
  label: string,
  agencyName: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await withTimeout(fn(), 12_000);
  } catch (err: any) {
    console.warn(`[portail] ${label} indisponible pour « ${agencyName} » :`, err?.message || err);
    return fallback;
  }
}

/**
 * Un projet Supabase en pause ne répond jamais : on borne chaque appel.
 *
 * Le paramètre est `PromiseLike` et non `Promise` : les constructeurs de
 * requêtes Supabase sont des « thenables » qui ne déclenchent la requête
 * qu'au premier `.then()` — ils n'exposent ni `catch` ni `finally` et ne
 * satisfont donc pas `Promise<T>`.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}
