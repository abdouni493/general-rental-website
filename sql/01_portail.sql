-- ============================================================================
-- DRIVEHUB — BASE DE DONNÉES DU PORTAIL MULTI-AGENCES
-- ============================================================================
-- À exécuter UNE FOIS dans le projet Supabase du site général :
--   https://dgtvozsaeejxtiqeazud.supabase.co
--   → SQL Editor → New query → coller ce fichier → Run
--
-- Idempotent : sûr sur un projet vierge ET rejouable sur un projet existant
-- (CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE).
--
-- CE QUE CETTE BASE CONTIENT
--   • les comptes d'administration du portail (auth.users + profiles) ;
--   • les CONNEXIONS aux agences partenaires (URL + clé anon) ;
--   • un JOURNAL des réservations émises par le portail (analytique) ;
--   • les réglages d'affichage du site.
--
-- CE QU'ELLE NE CONTIENT PAS — et ne contiendra jamais
--   • aucune voiture, aucun client, aucune réservation métier.
--     Le portail lit les flottes en direct chez chaque agence et écrit les
--     réservations dans LEUR base via leur RPC create_website_reservation.
--     Rien n'est dupliqué : une voiture modifiée chez l'agence change
--     instantanément sur le portail.
--
-- SOMMAIRE
--   0) Extensions
--   1) Comptes            profiles
--   2) Partenaires        partner_agencies
--   3) Journal            portal_reservations
--   4) Réglages           portal_settings
--   5) Index
--   6) Triggers           updated_at
--   7) Row Level Security
--   8) Fonctions d'authentification (comptes confirmés d'office)
--   9) RPC publiques      public_agencies, log_portal_reservation
--  10) Données de départ  les trois agences déjà intégrées
-- ============================================================================


-- ============================================================================
-- 0) EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;


-- ============================================================================
-- 1) COMPTES — une ligne par utilisateur de l'espace d'administration
-- ============================================================================
-- role = 'admin'  → accès complet
--        'worker' → compte supplémentaire créé par un admin
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text,
  email      text,
  role       text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'worker')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;


-- ============================================================================
-- 2) PARTENAIRES — le registre qui fait tout fonctionner
-- ============================================================================
-- Chaque ligne décrit UNE agence et la façon de joindre sa base.
--
--   supabase_url : https://xxxx.supabase.co du projet de l'agence
--   anon_key     : sa clé publique « anon », celle que son propre site sert
--                  déjà au navigateur. La RLS de SON projet reste la seule
--                  barrière de sécurité. Ne jamais mettre ici une clé
--                  « service_role ».
--
-- L'`id` de cette table est la clé de routage : chaque voiture affichée sur
-- le portail la porte, et c'est elle qui désigne la base où part la
-- réservation.
CREATE TABLE IF NOT EXISTS public.partner_agencies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  name          text NOT NULL,
  city          text,
  supabase_url  text NOT NULL,
  anon_key      text NOT NULL,
  logo_url      text,
  brand_color   text DEFAULT '#7C5CFF',
  phone         text,
  email         text,
  address       text,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_agencies_slug_unique UNIQUE (slug)
);


-- ============================================================================
-- 3) JOURNAL — trace analytique des réservations émises par le portail
-- ============================================================================
-- La réservation FAIT AUTORITÉ chez l'agence : cette table n'en garde qu'un
-- reflet, suffisant pour l'écran « Statistiques », et jamais relu par le site
-- public. `status = 'failed'` conserve aussi les tentatives qui n'ont pas
-- abouti : c'est le meilleur signal pour repérer une agence en panne.
CREATE TABLE IF NOT EXISTS public.portal_reservations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             uuid REFERENCES public.partner_agencies(id) ON DELETE SET NULL,
  agency_name           text NOT NULL,
  -- id de la réservation telle que créée DANS la base de l'agence
  remote_reservation_id uuid,
  car_id                uuid,
  car_label             text NOT NULL DEFAULT '',
  client_name           text NOT NULL DEFAULT '',
  client_phone          text,
  client_email          text,
  departure_date        date,
  return_date           date,
  total_days            integer NOT NULL DEFAULT 1,
  total_price           numeric NOT NULL DEFAULT 0,
  currency_code         text NOT NULL DEFAULT 'DZD',
  pickup_point_name     text,
  status                text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 4) RÉGLAGES — clé/valeur pour l'habillage du site
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.portal_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 5) INDEX
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_partner_agencies_active
  ON public.partner_agencies (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_portal_reservations_created
  ON public.portal_reservations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_reservations_agency
  ON public.portal_reservations (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portal_reservations_status
  ON public.portal_reservations (status);


-- ============================================================================
-- 6) TRIGGERS — updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public._touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_partner_agencies_updated ON public.partner_agencies;
CREATE TRIGGER trg_partner_agencies_updated
  BEFORE UPDATE ON public.partner_agencies
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();

DROP TRIGGER IF EXISTS trg_portal_settings_updated ON public.portal_settings;
CREATE TRIGGER trg_portal_settings_updated
  BEFORE UPDATE ON public.portal_settings
  FOR EACH ROW EXECUTE FUNCTION public._touch_updated_at();


-- ============================================================================
-- 7) ROW LEVEL SECURITY
-- ============================================================================
-- Modèle :
--   authenticated (admin connecté) → lecture / écriture complètes
--   anon (visiteur du site)        → AUCUN accès direct aux tables.
--
-- Le site public n'a besoin que de deux choses, toutes deux servies par des
-- RPC SECURITY DEFINER : la liste des agences actives (public_agencies) et
-- l'écriture d'une ligne de journal (log_portal_reservation). La table
-- partner_agencies reste donc fermée à l'anon — elle contient aussi les
-- agences désactivées et les coordonnées de gestion.

ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_agencies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_settings     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_auth_all ON public.profiles;
CREATE POLICY profiles_auth_all ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS partner_agencies_auth_all ON public.partner_agencies;
CREATE POLICY partner_agencies_auth_all ON public.partner_agencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS portal_reservations_auth_all ON public.portal_reservations;
CREATE POLICY portal_reservations_auth_all ON public.portal_reservations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS portal_settings_auth_all ON public.portal_settings;
CREATE POLICY portal_settings_auth_all ON public.portal_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Les réglages d'habillage sont, eux, purement publics.
DROP POLICY IF EXISTS portal_settings_anon_read ON public.portal_settings;
CREATE POLICY portal_settings_anon_read ON public.portal_settings
  FOR SELECT TO anon USING (true);


-- ============================================================================
-- 8) AUTHENTIFICATION — comptes créés CONFIRMÉS
-- ============================================================================
-- Pourquoi ne pas utiliser supabase.auth.signUp() depuis le navigateur ?
-- Parce que ce projet a `mailer_autoconfirm = false` : un compte créé par
-- signUp reste NON confirmé tant que le lien reçu par e-mail n'est pas
-- cliqué, et signInWithPassword le refuse ensuite. Sans serveur SMTP
-- configuré, l'administrateur ne pourrait jamais se connecter.
--
-- _create_auth_user insère donc directement dans auth.users avec
-- `email_confirmed_at = now()` et crée l'identité `email` correspondante : le
-- compte est utilisable immédiatement, et la connexion se fait ensuite par
-- l'authentification native Supabase, sans aucun contournement.

-- 8.0 Fonction interne — JAMAIS exposée au client.
CREATE OR REPLACE FUNCTION public._create_auth_user(
  p_email    text,
  p_password text,
  p_meta     jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = auth, public, extensions
AS $fn$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email   text := lower(btrim(p_email));
BEGIN
  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'EMAIL_REQUIRED';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'EMAIL_ALREADY_EXISTS';
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    coalesce(p_meta, '{}'::jsonb),
    '', '', '', '',
    false
  );

  INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  RETURN v_user_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public._create_auth_user(text, text, jsonb) FROM public, anon, authenticated;


-- 8.1 admin_exists — interrogée par la page de connexion.
--     Tant qu'elle renvoie false, le bouton « Créer un compte
--     administrateur » reste visible ; dès qu'elle renvoie true, il
--     disparaît.
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');
$fn$;

GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;


-- 8.2 create_admin_account — crée le PREMIER administrateur, et lui seul.
--     Second appel = refus. La garde de l'interface est ainsi doublée d'une
--     garde serveur : même en forçant la requête, on ne peut pas s'ajouter.
CREATE OR REPLACE FUNCTION public.create_admin_account(
  p_email    text,
  p_password text,
  p_username text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $fn$
DECLARE
  v_uid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'ADMIN_EXISTS');
  END IF;

  v_uid := public._create_auth_user(
    p_email, p_password,
    jsonb_build_object('role', 'admin', 'username', coalesce(p_username, ''))
  );

  INSERT INTO public.profiles (id, username, email, role)
  VALUES (v_uid, coalesce(NULLIF(btrim(p_username), ''), p_email), lower(btrim(p_email)), 'admin')
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin', username = EXCLUDED.username, email = EXCLUDED.email;

  RETURN jsonb_build_object('success', true, 'user_id', v_uid);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_admin_account(text, text, text) TO anon, authenticated;


-- 8.3 create_portal_user — comptes SUPPLÉMENTAIRES, réservés à un admin
--     déjà connecté (auth.uid() doit porter le rôle 'admin').
CREATE OR REPLACE FUNCTION public.create_portal_user(
  p_email    text,
  p_password text,
  p_username text DEFAULT NULL,
  p_role     text DEFAULT 'worker'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $fn$
DECLARE
  v_uid  uuid;
  v_role text := CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'worker' END;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ADMIN');
  END IF;

  v_uid := public._create_auth_user(
    p_email, p_password,
    jsonb_build_object('role', v_role, 'username', coalesce(p_username, ''))
  );

  INSERT INTO public.profiles (id, username, email, role)
  VALUES (v_uid, coalesce(NULLIF(btrim(p_username), ''), p_email), lower(btrim(p_email)), v_role)
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role, username = EXCLUDED.username, email = EXCLUDED.email;

  RETURN jsonb_build_object('success', true, 'user_id', v_uid);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_portal_user(text, text, text, text) TO authenticated;


-- ============================================================================
-- 9) RPC PUBLIQUES — le strict nécessaire au site anonyme
-- ============================================================================

-- 9.1 public_agencies — agences ACTIVES et champs d'affichage uniquement.
--     Le navigateur a besoin de l'URL et de la clé anon de chaque agence pour
--     lire sa flotte en direct : ce sont exactement les mêmes valeurs que
--     celles déjà servies par le site public de l'agence, et la RLS de son
--     projet reste sa protection. Les agences désactivées, les notes et les
--     coordonnées de gestion ne sortent pas d'ici.
CREATE OR REPLACE FUNCTION public.public_agencies()
RETURNS TABLE (
  id            uuid,
  slug          text,
  name          text,
  city          text,
  supabase_url  text,
  anon_key      text,
  logo_url      text,
  brand_color   text,
  display_order integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $fn$
  SELECT a.id, a.slug, a.name, a.city, a.supabase_url, a.anon_key,
         a.logo_url, a.brand_color, a.display_order
  FROM public.partner_agencies a
  WHERE a.is_active = true
  ORDER BY a.display_order, a.name;
$fn$;

GRANT EXECUTE ON FUNCTION public.public_agencies() TO anon, authenticated;


-- 9.2 log_portal_reservation — trace d'une demande, succès comme échec.
--     Appelée par le site anonyme APRÈS l'appel à l'agence. Elle n'accepte
--     qu'une insertion : rien ne peut être relu, modifié ou supprimé avec la
--     clé anon.
CREATE OR REPLACE FUNCTION public.log_portal_reservation(
  p_agency_id             uuid,
  p_agency_name           text,
  p_remote_reservation_id uuid,
  p_car_id                uuid,
  p_car_label             text,
  p_client_name           text,
  p_client_phone          text,
  p_client_email          text,
  p_departure_date        date,
  p_return_date           date,
  p_total_days            integer,
  p_total_price           numeric,
  p_currency_code         text DEFAULT 'DZD',
  p_pickup_point_name     text DEFAULT NULL,
  p_status                text DEFAULT 'sent',
  p_error_message         text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.portal_reservations (
    agency_id, agency_name, remote_reservation_id, car_id, car_label,
    client_name, client_phone, client_email,
    departure_date, return_date, total_days, total_price, currency_code,
    pickup_point_name, status, error_message
  ) VALUES (
    p_agency_id,
    coalesce(NULLIF(btrim(p_agency_name), ''), 'Agence'),
    p_remote_reservation_id,
    p_car_id,
    coalesce(p_car_label, ''),
    coalesce(p_client_name, ''),
    NULLIF(btrim(coalesce(p_client_phone, '')), ''),
    NULLIF(btrim(coalesce(p_client_email, '')), ''),
    p_departure_date,
    p_return_date,
    greatest(coalesce(p_total_days, 1), 1),
    coalesce(p_total_price, 0),
    coalesce(NULLIF(p_currency_code, ''), 'DZD'),
    NULLIF(btrim(coalesce(p_pickup_point_name, '')), ''),
    CASE WHEN p_status = 'failed' THEN 'failed' ELSE 'sent' END,
    left(coalesce(p_error_message, ''), 500)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.log_portal_reservation(
  uuid, text, uuid, uuid, text, text, text, text, date, date,
  integer, numeric, text, text, text, text
) TO anon, authenticated;


-- ============================================================================
-- 10) DONNÉES DE DÉPART — les trois agences déjà intégrées
-- ============================================================================
-- ON CONFLICT (slug) : rejouer ce fichier met à jour la connexion sans créer
-- de doublon, et sans toucher à is_active (une agence désactivée à la main le
-- reste).
INSERT INTO public.partner_agencies
  (slug, name, city, supabase_url, anon_key, brand_color, display_order)
VALUES
  (
    'mhd-auto', 'MHD Auto', 'Alger',
    'https://tjyqmxiqeegcnvopibyb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeXFteGlxZWVnY252b3BpYnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTg1MjIsImV4cCI6MjA4ODQ3NDUyMn0.7-6qvX4F3oebYm-W1bBl6SsKQf-A79bc1PP7PhpQYcQ',
    '#DC2626', 1
  ),
  (
    'icar', 'iCar', 'Alger',
    'https://bmwgwmaapiojtwruprzz.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtd2d3bWFhcGlvanR3cnVwcnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzUwNTEsImV4cCI6MjEwNDExMTA1MX0.j3rdjtK6h1PonGNIknSnOMwSJRub3FPgi4XOXD_5YNc',
    '#C8A13C', 2
  ),
  (
    'sz-cars', 'SZ Cars', 'Béjaïa',
    'https://zhmkzvbfhppeerjqqbqn.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobWt6dmJmaHBwZWVyanFxYnFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NzI3OTgsImV4cCI6MjEwMDI0ODc5OH0.C_rIxo8Jex9DQeKj-1R46TzhjsWxxO3900_906AcVvc',
    '#D4AF37', 3
  )
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  city         = EXCLUDED.city,
  supabase_url = EXCLUDED.supabase_url,
  anon_key     = EXCLUDED.anon_key,
  brand_color  = EXCLUDED.brand_color,
  updated_at   = now();


-- Réglages d'habillage par défaut.
INSERT INTO public.portal_settings (key, value)
VALUES (
  'site',
  jsonb_build_object(
    'siteName',    'DriveHub',
    'tagline',     'Toutes les agences. Une seule réservation.',
    'description', 'Le portail qui réunit la flotte de plusieurs agences de location de voitures.'
  )
)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- VÉRIFICATION — à lancer après l'exécution du script
-- ============================================================================
-- SELECT public.admin_exists();                    -- false avant le 1er compte
-- SELECT slug, name, is_active FROM public.partner_agencies ORDER BY display_order;
-- SELECT * FROM public.public_agencies();
--
-- Ensuite, sur le site : /admin/login → « Créer un compte administrateur ».
-- Le bouton disparaît dès que le compte est créé.
-- ============================================================================
