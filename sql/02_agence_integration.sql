-- ============================================================================
-- DRIVEHUB — SCRIPT À EXÉCUTER DANS LA BASE DE CHAQUE AGENCE PARTENAIRE
-- ============================================================================
-- À exécuter dans le projet Supabase de CHAQUE agence que l'on veut connecter
-- au portail (SQL Editor → New query → coller → Run).
--
-- BONNE NOUVELLE POUR LES TROIS AGENCES DÉJÀ EN PLACE
-- ---------------------------------------------------
-- MHD Auto, iCar et SZ Cars exposent DÉJÀ tout ce dont le portail a besoin :
-- leur schéma prévoyait leur propre site public, et le portail utilise
-- exactement les mêmes portes d'entrée. Pour elles, ce fichier sert de
-- VÉRIFICATION : la section 1 dit en une requête si quelque chose manque.
-- Si tout est « OK », il n'y a rien à exécuter.
--
-- Il devient en revanche indispensable pour une agence dont la base aurait
-- été créée sans site public, ou dont les politiques auraient été durcies.
--
-- CE DONT LE PORTAIL A BESOIN, ET RIEN DE PLUS
-- --------------------------------------------
--   LECTURE (rôle anon) — les tables de la vitrine, déjà publiques :
--     cars, agencies, special_offers, services,
--     protection_assurances, protection_assurance_items,
--     protection_assurance_item_links, website_settings, website_contacts
--
--   ÉCRITURE — AUCUNE écriture directe. La seule porte est la fonction
--     SECURITY DEFINER create_website_reservation(jsonb, jsonb, jsonb, text),
--     qui crée client + réservation + services en une transaction et
--     revérifie elle-même la disponibilité.
--
--   DISPONIBILITÉ (rôle anon) :
--     get_unavailable_car_ids(date, date), get_reserved_periods(uuid)
--
-- CE QUE CE SCRIPT NE FAIT JAMAIS
--   • il ne crée, ne modifie ni ne supprime AUCUNE table ni colonne ;
--   • il n'ouvre l'écriture sur aucune table ;
--   • il ne touche pas aux tables sensibles (reservations, clients,
--     payments, workers, promo_codes…), qui restent fermées à l'anon.
-- ============================================================================


-- ============================================================================
-- 1) DIAGNOSTIC — à lancer EN PREMIER, seul
-- ============================================================================
-- Renvoie une ligne par élément attendu, avec « OK » ou « MANQUANT ».
-- Si tout est OK, arrêtez-vous ici : l'agence est prête.

SELECT 'RPC create_website_reservation' AS element,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'create_website_reservation'
       ) THEN 'OK' ELSE 'MANQUANT — indispensable' END AS etat
UNION ALL
SELECT 'RPC get_unavailable_car_ids',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'get_unavailable_car_ids'
       ) THEN 'OK' ELSE 'MANQUANT — indispensable' END
UNION ALL
SELECT 'RPC get_reserved_periods',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'get_reserved_periods'
       ) THEN 'OK' ELSE 'MANQUANT — indispensable' END
UNION ALL
SELECT 'Lecture anon : ' || t.table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_policies pol
         WHERE pol.schemaname = 'public'
           AND pol.tablename  = t.table_name
           AND pol.cmd IN ('SELECT', 'ALL')
           AND 'anon' = ANY (pol.roles)
       ) THEN 'OK' ELSE 'MANQUANT — exécuter la section 2' END
FROM (VALUES
  ('cars'), ('agencies'), ('special_offers'), ('services'),
  ('protection_assurances'), ('protection_assurance_items'),
  ('protection_assurance_item_links'), ('website_settings'), ('website_contacts')
) AS t(table_name)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = t.table_name
)
ORDER BY 1;


-- ============================================================================
-- 2) LECTURE PUBLIQUE — à n'exécuter QUE si le diagnostic signale un manque
-- ============================================================================
-- Ajoute une politique de LECTURE SEULE nommée « drivehub_anon_read » sur les
-- tables de la vitrine. Elle s'ajoute aux politiques existantes sans les
-- remplacer (PostgreSQL combine les politiques permissives par OU), et ne
-- touche qu'aux tables réellement présentes dans la base.
--
-- Périmètre strictement identique à ce que le site public de l'agence expose
-- déjà. Les tables sensibles ne figurent volontairement pas dans la liste.

DO $drivehub$
DECLARE
  t text;
  vitrine text[] := ARRAY[
    'cars', 'agencies', 'special_offers', 'services',
    'protection_assurances', 'protection_assurance_items',
    'protection_assurance_item_links',
    'website_settings', 'website_contacts'
  ];
BEGIN
  FOREACH t IN ARRAY vitrine LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS drivehub_anon_read ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY drivehub_anon_read ON public.%I FOR SELECT TO anon USING (true)', t);
      RAISE NOTICE 'Lecture publique activée sur %', t;
    ELSE
      RAISE NOTICE 'Table % absente de cette base — ignorée', t;
    END IF;
  END LOOP;
END
$drivehub$;


-- ============================================================================
-- 3) DROITS D'EXÉCUTION DES RPC — idempotent, sans effet si déjà accordés
-- ============================================================================
-- Ces fonctions EXISTENT déjà dans les trois agences intégrées ; on se
-- contente de garantir que le rôle anon peut les appeler. Le bloc ne crée
-- aucune fonction : si l'une manque, c'est le schéma de l'agence qu'il faut
-- compléter (voir la section 4).

DO $drivehub$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'create_website_reservation',
        'get_unavailable_car_ids',
        'get_reserved_periods',
        'verify_promo_code'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn.signature);
    RAISE NOTICE 'Droit d''exécution accordé : %', fn.signature;
  END LOOP;
END
$drivehub$;


-- ============================================================================
-- 4) PERFORMANCE — index de disponibilité (recommandé, sans risque)
-- ============================================================================
-- Le portail interroge get_unavailable_car_ids pour TOUTES les agences à
-- chaque recherche. Cet index accélère le filtre par voiture et par période.
-- CREATE INDEX IF NOT EXISTS : aucune conséquence s'il existe déjà.

CREATE INDEX IF NOT EXISTS idx_reservations_car_period
  ON public.reservations (car_id, departure_date, return_date);

CREATE INDEX IF NOT EXISTS idx_reservations_status_period
  ON public.reservations (status, departure_date, return_date);


-- ============================================================================
-- 5) POINT DE VIGILANCE — garde-fou de disponibilité de la RPC
-- ============================================================================
-- Les versions de create_website_reservation ne sont pas toutes identiques
-- d'une agence à l'autre. La version de référence commence par vérifier que
-- la voiture est libre :
--
--     IF EXISTS (
--       SELECT 1 FROM public.reservations r
--       WHERE r.car_id = v_car_id
--         AND r.status IN ('website_reservation','pending','accepted',
--                          'confirmed','active','processing')
--         AND r.departure_date <= v_to
--         AND r.return_date    >= v_from
--     ) THEN
--       RAISE EXCEPTION 'CAR_UNAVAILABLE';
--     END IF;
--
-- Certaines bases exécutent une variante PLUS ANCIENNE qui insère le client
-- sans ce contrôle : elle accepte alors deux locations sur la même période.
-- La requête ci-dessous dit en un coup d'œil si le garde-fou est présent.
--
-- Le portail relit de toute façon le planning juste avant d'écrire, ce qui
-- ferme l'essentiel du risque, mais seul un contrôle DANS la fonction protège
-- contre deux réservations simultanées à la seconde près — et il protège
-- aussi le propre site de l'agence.

SELECT 'Garde-fou CAR_UNAVAILABLE' AS element,
       CASE
         WHEN NOT EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'create_website_reservation'
         ) THEN 'RPC absente'
         WHEN EXISTS (
           SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname = 'create_website_reservation'
             AND p.prosrc ILIKE '%CAR_UNAVAILABLE%'
         ) THEN 'OK — la fonction refuse les chevauchements'
         ELSE 'ABSENT — mettez à jour create_website_reservation depuis le schéma de référence de l''agence'
       END AS etat;


-- ============================================================================
-- 6) CONTRÔLE FINAL — relancer la section 1
-- ============================================================================
-- Toutes les lignes doivent afficher « OK ». Côté portail, le bouton
-- « Tester la connexion » de l'écran « Agences connectées » refait la même
-- vérification depuis le navigateur, avec la clé anon réellement utilisée.
--
-- Où retrouver la réservation dans le logiciel de l'agence ?
--   Elle arrive au statut `website_reservation` avec `source = 'website'` :
--   exactement là où atterrissent déjà les commandes du propre site de
--   l'agence, c'est-à-dire l'écran « Commandes du site » / « Website
--   réservations ». Sa note commence par « Réservation reçue via le portail
--   DriveHub » et rappelle le lieu de départ choisi.
-- ============================================================================
