# Redside Bot — LS CUSTOM / Redside RP

Portail web + bot Discord pour centraliser les recrutements, candidatures, tickets, VIP LIST et partenariats de LS CUSTOM.

## Architecture

**Le site est le produit principal. Discord est la couche de liaison.**

- Joueurs : site public, formulaires, espace de suivi Discord
- Staff : dashboard web authentifié par Discord OAuth2
- Bot : publications, notifications et commandes d'administration
- SQLite : données, paramètres et journal d'audit

## Fonctionnalités

### Joueurs

- 🏠 Portail public LS CUSTOM
- 📋 Liste des recrutements ouverts
- 🧾 Formulaires de candidature dynamiques
- ❓ Questions personnalisées par recrutement
- 📎 Pièces jointes (images/PDF, jusqu'à 5 fichiers de 8 Mo)
- 🔐 Connexion Discord joueur
- 📊 `/suivi` pour retrouver ses candidatures et tickets
- 🤝 Demandes de partenariat entreprise
- ⭐ Demandes VIP LIST
- 🛠️ Tickets support
- 📎 Pièces jointes sur les tickets
- 🖥️ Statut FiveM optionnel via `FIVEM_SERVER_URL`
- 📰 Actualité et description publiques configurables

### Staff

- 🔐 Discord OAuth2 + contrôle des serveurs où l'utilisateur possède `Gérer le serveur` ou `Administrateur`
- 📊 Vue générale et statistiques
- 📋 Gestion complète des recrutements
- 📢 Publication Discord avec bouton vers le site
- 🟢 Ouverture / 🔴 fermeture
- 📝 Questions personnalisées
- 📨 Candidatures avec filtres et pièces jointes
- ✅ Acceptation / ❌ refus / ⏳ attente
- 🔔 Notification Discord du changement de statut + DM au candidat quand son identifiant Discord est valide
- 🎫 Gestion des tickets
- 🤝 Partenariats et ⭐ VIP LIST dans le même centre de tickets
- 🧾 Journal d'audit
- ⚙️ Configuration Discord + contenu public
- 📱 Interface responsive

### Sécurité / robustesse

- Les routes publiques sont verrouillées sur `DEFAULT_GUILD_ID`.
- Les APIs staff vérifient l'accès au serveur dans la session OAuth.
- Rate limit public basique par IP.
- Upload limité à 8 Mo par fichier et aux images/PDF.
- URLs d'images distantes obligatoirement en HTTPS.
- SQLite en WAL.
- Les actions staff importantes sont auditées.

## Installation

```bash
npm install
copy .env.example .env
npm start
```

## Variables `.env`

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback
PLAYER_REDIRECT_URI=http://localhost:3000/auth/player/callback
SESSION_SECRET=change-me
PORT=3000
BASE_URL=http://localhost:3000
DEFAULT_GUILD_ID=
FIVEM_SERVER_URL=
FIVEM_MAX_PLAYERS=48
```

`PLAYER_REDIRECT_URI` doit être déclaré dans le Discord Developer Portal. Si elle est absente, le projet utilise automatiquement `${BASE_URL}/auth/player/callback`.

## Discord Developer Portal

Déclarer les deux redirect URIs :

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/player/callback`

En production, utiliser le domaine HTTPS réel.

Le bot doit pouvoir lire et envoyer des messages dans les salons configurés.

## Dashboard

Ouvrir `http://localhost:3000/admin`.

Le staff se connecte avec Discord. Seuls les serveurs où son compte possède `Gérer le serveur` ou `Administrateur` sont proposés.

Dans **Configuration**, renseigner :

- salon des recrutements
- salon des logs
- salon des tickets
- rôle recruteur (réservé pour les évolutions de permissions)
- actualité publique
- description du serveur

## FiveM

Pour activer le statut serveur, définir `FIVEM_SERVER_URL` vers l'URL HTTP de l'endpoint FiveM, par exemple une adresse accessible qui expose `/players.json`.

Le dashboard et le portail indiquent alors si le serveur est en ligne et le nombre de joueurs.

## Commandes Discord

- `/recrutement ouvrir`
- `/recrutement fermer`
- `/config`
- `/candidatures`

Le bot ne remplace pas les formulaires du site : les joueurs candidatent et créent leurs demandes depuis le portail web.

## Structure

- `src/bot.js` — Discord, publications et notifications
- `src/dashboard.js` — serveur web, OAuth2 et API
- `src/db.js` — SQLite, données et audit
- `src/index.js` — démarrage
- `public/portal.*` — portail joueur
- `public/recrutement.*` — formulaire de candidature
- `public/tracking.*` — espace de suivi joueur
- `public/app.*` — dashboard staff

## Production

Pour une vraie mise en ligne :

1. HTTPS obligatoire.
2. `SESSION_SECRET` long et aléatoire.
3. Utiliser un vrai session store (Redis, etc.) plutôt que le MemoryStore Express.
4. Sauvegarder `data/redside.sqlite` et `data/uploads`.
5. Placer le site derrière un reverse proxy.
6. Vérifier les permissions Discord du bot et les redirect URIs OAuth2.
