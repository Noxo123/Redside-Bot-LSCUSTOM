# Redside Bot — LSCUSTOM

Bot Discord de recrutement avec dashboard web connecté à Discord et SQLite.

## Fonctionnalités

- 🔐 Connexion dashboard via Discord OAuth2
- 🏢 Sélection des serveurs où l’utilisateur possède `Gérer le serveur`
- 📊 Statistiques : recrutements, ouverts, candidatures, en attente, acceptées, refusées
- 📋 Création et historique des recrutements
- 🟢 Ouverture / 🔴 fermeture des recrutements
- 📢 Publication directe dans un salon Discord
- 🖼️ Upload d’image depuis le dashboard (PNG/JPG/WebP/GIF, 8 Mo) et envoi comme pièce jointe Discord
- 🔗 Image par URL
- 📝 Bouton `Postuler` + formulaire Discord (modal)
- 📨 Stockage SQLite des candidatures
- 👀 Consultation des candidatures depuis Discord et dashboard
- ✅ / ❌ Acceptation ou refus depuis le dashboard
- 🧾 Salon de logs
- ⚙️ Configuration par serveur
- 🛡️ Contrôle d’accès côté API par serveur
- 📝 Journal d’audit des actions
- 📱 Dashboard responsive
- 💾 SQLite avec WAL

## Installation

```bash
npm install
copy .env.example .env
npm start
```

## Discord Developer Portal

Créer une application Discord, récupérer le token, le Client ID et le Client Secret.

Dans OAuth2, ajouter exactement l’URL définie dans `DISCORD_REDIRECT_URI`, par exemple :

`http://localhost:3000/auth/callback`

Le bot doit être invité avec les permissions nécessaires pour voir/envoyer des messages dans le salon de recrutement et le salon de logs.

## Variables

Voir `.env.example`.

`SESSION_SECRET` doit être une valeur aléatoire longue en production.

## Dashboard

Ouvrir `http://localhost:3000`, puis se connecter avec Discord.

Le serveur doit être accessible depuis le navigateur et, pour une utilisation publique, passer derrière HTTPS avec un vrai domaine. En production, utiliser une vraie session store (Redis par exemple) plutôt que le MemoryStore d’Express.

## Structure

- `src/bot.js` — commandes, boutons, modals et publication Discord
- `src/dashboard.js` — OAuth2, API REST et dashboard
- `src/db.js` — SQLite et modèle de données
- `src/index.js` — démarrage
- `public/` — interface web

## Commandes Discord

- `/recrutement ouvrir`
- `/recrutement fermer`
- `/config`
- `/candidatures`

## Évolution prévue

Le socle est volontairement modulaire pour ajouter ensuite : modèles de recrutements, questions configurables par recrutement, notifications DM, rôles automatiques, planification, export CSV, recherche/filtrage avancé, pagination, embeds personnalisables, statistiques détaillées et système multi-staff.
