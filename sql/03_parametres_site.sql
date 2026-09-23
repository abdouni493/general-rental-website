-- ============================================================================
-- DRIVEHUB — PARAMÈTRES DU SITE (écran Admin → Paramètres)
-- ============================================================================
-- À exécuter dans le projet Supabase du PORTAIL (SQL Editor → Run), après
-- 01_portail.sql. Idempotent : rejouable sans risque.
--
--   1) portal_settings : table + RLS (lecture publique, écriture admin)
--   2) normalise la ligne « site » au nouveau format (nom en deux parties)
--   3) bucket Storage public « site-assets » pour le logo et les fonds
-- ============================================================================


-- 1) TABLE DES RÉGLAGES (déjà créée par 01_portail.sql ; rappelée ici au cas où)
CREATE TABLE IF NOT EXISTS public.portal_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_settings_auth_all ON public.portal_settings;
CREATE POLICY portal_settings_auth_all ON public.portal_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS portal_settings_anon_read ON public.portal_settings;
CREATE POLICY portal_settings_anon_read ON public.portal_settings
  FOR SELECT TO anon USING (true);

GRANT SELECT ON public.portal_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_settings TO authenticated;


-- 2) LIGNE « site » — l'ancien jeu de départ stockait siteName = 'DriveHub'
--    d'un bloc et des clés désormais inutilisées. On repart sur le format
--    attendu par l'écran Paramètres ; les champs absents prennent les
--    valeurs par défaut côté application.
INSERT INTO public.portal_settings (key, value)
VALUES ('site', jsonb_build_object('siteName', 'Drive', 'siteNameAccent', 'Hub'))
ON CONFLICT (key) DO NOTHING;

UPDATE public.portal_settings
SET value = (value - 'tagline' - 'description')
            || jsonb_build_object('siteName', 'Drive', 'siteNameAccent', 'Hub')
WHERE key = 'site'
  AND value->>'siteName' = 'DriveHub'
  AND NOT (value ? 'siteNameAccent');


-- 3) STOCKAGE DES IMAGES — bucket public, 5 Mo max, images uniquement
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets', 'site-assets', true, 5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS site_assets_public_read ON storage.objects;
CREATE POLICY site_assets_public_read ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS site_assets_auth_insert ON storage.objects;
CREATE POLICY site_assets_auth_insert ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-assets');

DROP POLICY IF EXISTS site_assets_auth_update ON storage.objects;
CREATE POLICY site_assets_auth_update ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'site-assets') WITH CHECK (bucket_id = 'site-assets');

DROP POLICY IF EXISTS site_assets_auth_delete ON storage.objects;
CREATE POLICY site_assets_auth_delete ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'site-assets');


-- VÉRIFICATION
-- SELECT value FROM public.portal_settings WHERE key = 'site';
-- SELECT id, public FROM storage.buckets WHERE id = 'site-assets';
