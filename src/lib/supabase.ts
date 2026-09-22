import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Client Supabase du PORTAIL
// ----------------------------------------------------------------------------
// Une seule base ici : celle du site général. Elle porte les comptes
// administrateurs, les connexions aux agences et le journal des réservations.
// Les bases des agences sont ouvertes dynamiquement par lib/agencyClients.ts.
// ============================================================================

const FALLBACK_URL = 'https://dgtvozsaeejxtiqeazud.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndHZvenNhZWVqeHRpcWVhenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTU4MTYsImV4cCI6MjEwNTY3MTgxNn0.yGOWyIg8YpTfuyNC2cdXubXS24shkKwkLFpB6Sk4pU8';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // La session de l'admin doit survivre à un rafraîchissement de page :
    // contrairement aux applications d'agence, le portail n'a qu'un seul
    // espace connecté et aucun risque de collision de jetons.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'drivehub-admin-auth',
  },
});
