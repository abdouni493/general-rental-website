import { supabase } from '../lib/supabase';
import type { AdminUser } from '../types';

// ============================================================================
// AuthService — comptes de l'espace d'administration du portail
// ----------------------------------------------------------------------------
// Les comptes vivent dans `auth.users` (l'authentification native Supabase) et
// sont doublés d'une ligne `public.profiles` qui porte le rôle.
//
// Pourquoi une RPC plutôt que `supabase.auth.signUp()` ?
// Le projet a `mailer_autoconfirm = false` : un compte créé par signUp reste
// NON confirmé tant que le lien reçu par e-mail n'est pas cliqué, et
// `signInWithPassword` le refuse. La RPC `create_admin_account` insère
// l'utilisateur avec `email_confirmed_at = now()` : le compte est utilisable
// immédiatement, sans configuration SMTP.
//
// Le bouton « Créer un compte administrateur » disparaît dès qu'un admin
// existe : `admin_exists()` est interrogée au chargement de la page de
// connexion, et la RPC refuse elle-même toute création supplémentaire
// (ADMIN_EXISTS). La garde est donc à la fois visuelle ET serveur.
// ============================================================================

export class AuthService {
  /**
   * Un administrateur est-il déjà enregistré ?
   *
   * Trois réponses possibles, et il faut les distinguer :
   *   'yes'   → un admin existe, on masque la création ;
   *   'no'    → aucun admin, on propose la création ;
   *   'setup' → la fonction n'existe pas, donc le script SQL du portail n'a
   *             pas encore été exécuté. Afficher « un admin existe déjà »
   *             serait trompeur : on dit à l'utilisateur ce qu'il doit faire.
   *
   * Toute autre panne retombe sur 'yes' : en cas de doute mieux vaut un
   * bouton absent qu'un formulaire d'inscription ouvert à tous.
   */
  static async adminExists(): Promise<'yes' | 'no' | 'setup'> {
    const { data, error } = await supabase.rpc('admin_exists');
    if (error) {
      const missing =
        error.code === 'PGRST202' ||
        /could not find the function|does not exist/i.test(error.message || '');
      if (missing) {
        console.warn("[auth] base du portail non initialisée : exécutez sql/01_portail.sql");
        return 'setup';
      }
      console.warn('[auth] admin_exists indisponible :', error.message);
      return 'yes';
    }
    return data === true ? 'yes' : 'no';
  }

  /** Crée le tout premier administrateur. Échoue si un admin existe déjà. */
  static async createFirstAdmin(
    email: string, password: string, username: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('create_admin_account', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_username: username.trim() || null,
    });
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error || 'UNKNOWN' };
    return { success: true };
  }

  static async signIn(email: string, password: string): Promise<AdminUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error('NO_USER');

    const profile = await this.loadProfile(data.user.id);
    return {
      id: data.user.id,
      email: data.user.email || email,
      username: profile?.username || data.user.email || '',
      role: profile?.role || 'admin',
    };
  }

  static async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  /** Session courante, rétablie au rechargement de la page. */
  static async getCurrentUser(): Promise<AdminUser | null> {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;

    const profile = await this.loadProfile(user.id);
    return {
      id: user.id,
      email: user.email || '',
      username: profile?.username || user.email || '',
      role: profile?.role || 'admin',
    };
  }

  private static async loadProfile(
    userId: string,
  ): Promise<{ username: string; role: 'admin' | 'worker' } | null> {
    const { data } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', userId)
      .maybeSingle();
    return data ? { username: data.username || '', role: (data.role as any) || 'admin' } : null;
  }

  // ─── Comptes supplémentaires (créés depuis l'espace admin) ────────────────

  /** Ajoute un utilisateur du portail. Réservé à un admin connecté. */
  static async createUser(
    email: string, password: string, username: string, role: 'admin' | 'worker',
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('create_portal_user', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
      p_username: username.trim() || null,
      p_role: role,
    });
    if (error) return { success: false, error: error.message };
    if (!data?.success) return { success: false, error: data?.error || 'UNKNOWN' };
    return { success: true };
  }

  static async listUsers(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, role, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email || '',
      username: row.username || '',
      role: row.role || 'admin',
    }));
  }
}

/** Messages d'erreur d'authentification → texte lisible en français. */
export function authErrorLabel(raw: string): string {
  const message = (raw || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (message.includes('email not confirmed')) return "Ce compte n'est pas confirmé. Créez-le depuis cette page pour qu'il le soit automatiquement.";
  if (message.includes('admin_exists')) return 'Un compte administrateur existe déjà.';
  if (message.includes('email_already_exists')) return 'Cette adresse e-mail est déjà utilisée.';
  if (message.includes('password_too_short')) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (message.includes('email_required')) return "L'adresse e-mail est obligatoire.";
  if (message.includes('not_admin')) return "Seul un administrateur peut créer des comptes.";
  if (message.includes('rate limit')) return 'Trop de tentatives. Patientez une minute.';
  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return 'Base du portail injoignable. Vérifiez votre connexion.';
  }
  return raw || 'Une erreur est survenue.';
}
