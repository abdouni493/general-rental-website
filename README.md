# DriveHub — portail multi-agences de location de voitures

Un seul site public qui réunit la flotte de **plusieurs agences de location
indépendantes**. Le client compare, choisit, réserve — et sa demande part
**directement dans le logiciel de l'agence propriétaire du véhicule**.

---

## Le principe en une phrase

> Le portail ne possède aucune voiture et ne stocke aucune réservation.
> Il lit les flottes **en direct** chez chaque agence et écrit les
> réservations **chez elles**.

Conséquences concrètes :

| | |
|---|---|
| Une agence modifie un tarif | il change **immédiatement** sur le portail |
| Une agence masque une voiture | elle disparaît du portail |
| Un client réserve sur le portail | la commande arrive dans l'écran « Commandes du site » de l'agence, au statut `website_reservation` |
| Une agence est en panne | **les autres continuent** de s'afficher normalement |

Aucune synchronisation, aucun import, aucune copie à maintenir.

---

## La règle métier centrale

Dès qu'un véhicule est choisi, **son agence devient le cadre de tout le reste** :

- les **lieux de départ et de retour** proposés sont ceux de cette agence, et
  d'elle seule — une autre enseigne ne peut pas remettre ce véhicule ;
- les **assurances** et les **services** affichés sont son catalogue à elle ;
- les **dates bloquées** viennent de son planning ;
- la **réservation** part dans sa base.

Changer de véhicule pour une autre agence réinitialise lieux, assurance et
services : les conserver produirait une réservation incohérente.

---

## Mise en route

### 1. Base du portail

Ouvrir le projet Supabase du site général → **SQL Editor** → coller
[`sql/01_portail.sql`](sql/01_portail.sql) → **Run**.

Le script crée les comptes, le registre des agences, le journal des
réservations, et **préremplit les trois agences déjà intégrées**
(MHD Auto, iCar, SZ Cars). Il est rejouable sans risque.

### 2. Bases des agences

[`sql/02_agence_integration.sql`](sql/02_agence_integration.sql) est avant tout
un **script de vérification**. Sa section 1 dit en une requête si l'agence
expose déjà ce qu'il faut.

Pour MHD Auto, iCar et SZ Cars, **tout est déjà en place** : leur schéma
prévoyait leur propre site public et le portail emprunte les mêmes portes.
Les sections suivantes ne servent qu'à une agence dont la base aurait été
créée sans site public, ou durcie depuis.

### 3. Lancer le site

```bash
npm install
npm run dev
```

### 4. Créer le compte administrateur

Aller sur `/admin/login` → **« Créer un compte administrateur »**.

Le bouton n'apparaît que tant qu'aucun administrateur n'existe. Dès que le
compte est créé il disparaît, et la fonction SQL refuse de toute façon un
second appel : la garde est **à la fois visuelle et serveur**.

> Le compte est inséré dans `auth.users` avec `email_confirmed_at` déjà
> renseigné, donc utilisable **immédiatement** — sans serveur SMTP ni lien de
> confirmation à cliquer.

---

## Connecter une nouvelle agence

Espace admin → **Agences connectées** → **Connecter une agence**.

Trois informations suffisent :

| Champ | Où le trouver |
|---|---|
| **Nom affiché** | libre |
| **URL du projet Supabase** | tableau de bord de l'agence → Settings → API → *Project URL* |
| **Clé publique `anon`** | Settings → API → Project API keys → **anon / public** |

Le bouton **Tester la connexion** interroge réellement l'agence avant
l'enregistrement : nombre de véhicules lus, nombre de lieux de retrait, et
présence de la fonction de réservation.

> ⚠️ Toujours la clé **`anon`**, jamais `service_role`. La clé anon est publique
> par conception — c'est déjà celle que le site de l'agence sert au navigateur.
> La sécurité repose sur les règles RLS de son projet, pas sur le secret de
> cette clé.

---

## Structure

```
src/
├── lib/
│   ├── supabase.ts          client du portail (comptes, registre, journal)
│   └── agencyClients.ts     pool de clients — un par agence, + garde-fous réseau
├── services/
│   ├── AgencyRegistry.ts    registre des agences + diagnostic de connexion
│   ├── FleetService.ts      agrégation multi-agences (lecture)
│   ├── BookingService.ts    routage d'une réservation vers l'agence propriétaire
│   ├── AuthService.ts       comptes de l'espace admin
│   └── StatsService.ts      statistiques du journal
├── context/AppContext.tsx   état du site public, chargement progressif
├── components/
│   ├── site/                vitrine (accueil, flotte, promotions, agences, contact)
│   ├── booking/             tunnel de réservation en 6 étapes
│   ├── admin/               tableau de bord, agences, statistiques
│   └── ui/                  briques partagées
└── sql/                     scripts à exécuter (portail + agences)
```

---

## Points d'attention rencontrés en production

Ces choix ne sont pas théoriques : ils viennent de ce que les bases réelles
ont montré.

**Les schémas d'agence ont divergé.** La base MHD Auto en service n'a pas la
colonne `is_hidden_from_site` que son propre fichier de schéma déclare. Un
filtre `.eq('is_hidden_from_site', false)` renvoyait `42703` et faisait
disparaître **toute sa flotte**. Le portail lit donc `select('*')` et trie
côté client, où une colonne absente vaut simplement « non masquée ».

**Toutes les agences ne valident pas la disponibilité.** La fonction
`create_website_reservation` déployée chez au moins une agence ne contient pas
le garde-fou `CAR_UNAVAILABLE` de sa version de référence. Le portail relit
donc le planning juste avant d'écrire. La section 5 du script agence permet
de repérer les bases concernées.

**Une agence morte ne doit pas bloquer les vivantes.** Un projet Supabase en
pause ne répond jamais. Chaque appel est borné par un délai de garde, et le
chargement est **progressif** : chaque agence alimente la page dès qu'elle
répond, au lieu de faire attendre tout le monde derrière la plus lente.

**Deux graphies pour la même colonne.** La devise s'appelle `currency_code`
chez une agence et `currency` chez les deux autres. La charge utile envoyée
porte **les deux clés** : chaque fonction lit celle qu'elle connaît.

**Pas de code promo sur le portail.** Selon l'agence, la fonction applique la
remise elle-même ou attend un total déjà remisé. Envoyer un code depuis un
site neutre fausserait la comptabilité d'une partie des agences. Les
promotions passent par les offres spéciales, lues de façon identique partout.

---

## Sécurité

- Le portail est **anonyme** chez les agences : il ne lit que les tables de la
  vitrine et n'écrit que par leur fonction `SECURITY DEFINER`.
- Les tables sensibles des agences (réservations, clients, paiements,
  employés, salaires) **restent fermées** — le portail n'y a aucun accès.
- Le site public ne touche jamais la table `partner_agencies` : deux fonctions
  `SECURITY DEFINER` lui servent le strict nécessaire.
- **Aucun paiement** n'est demandé ni traité sur le portail. La caution et le
  règlement se font à l'agence, au retrait.

---

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement sur le port 3000 |
| `npm run build` | bundle de production dans `dist/` |
| `npm run preview` | sert le bundle de production |
| `npm run lint` | vérification TypeScript (`tsc --noEmit`) |
