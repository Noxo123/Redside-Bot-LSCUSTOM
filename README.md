# Redside Bot — LS CUSTOM / Redside RP

Portail web + bot Discord pour centraliser les recrutements, l'activité RH, les partenariats, les tickets et le suivi LS CUSTOM.

## Architecture

**Le site est le produit principal. Discord est la couche de liaison.**

- Portail public : candidatures, tickets, VIP LIST, partenariats
- Espace employé : connexion Discord par `/connexion`, tableau de bord et agenda RH
- Gestion : équipe, activité/quota, partenariats et centre développeur
- Bot : publications, notifications, commandes et synchronisation des partenariats
- SQLite : données, permissions, quotas, accès partenaires et audit

## Pages principales

| Route | Usage |
|---|---|
| `/` | Portail public LS CUSTOM |
| `/recrutements` | Recrutements ouverts |
| `/recrutement/:id` | Formulaire de candidature |
| `/suivi` | Suivi des candidatures et tickets |
| `/connexion` | Connexion employé par code Discord |
| `/dashboard` | Tableau de bord LS CUSTOM |
| `/equipe` | Équipe et rôles |
| `/activite` | Activité, quotas et podium |
| `/agenda` | Agenda RH |
| `/partenariats` | Gestion des partenariats staff ou espace client par lien |
| `/developpeur` | Centre développeur et RBAC |
| `/podium` | Podium hebdomadaire public / iframe |

Les anciennes pages d'administration et leurs scripts dédiés ont été retirés afin d'éviter deux interfaces staff concurrentes.

## Fonctionnalités

### Public

- 🏠 Portail LS CUSTOM
- 📋 Recrutements ouverts
- 🧾 Formulaires de candidature dynamiques
- ❓ Questions personnalisées
- 📎 Pièces jointes images/PDF
- 🔐 Connexion Discord pour le suivi
- 🎫 Tickets support / VIP LIST / partenariats
- 🤝 Espace client partenaire par lien sécurisé
- 🔗 Connexion Discord partenaire sans rôle LS CUSTOM
- 🏆 Podium hebdomadaire intégrable par iframe
- 🖥️ Statut FiveM optionnel

### Employés / RH

- 🔐 Connexion par code temporaire envoyé via Discord
- 👤 Profil Discord et permissions RBAC
- 📊 Tableau de bord organisation
- 👥 Gestion de l'équipe
- 📈 Import des relevés d'activité
- 💰 Quota individuel de **20 000 000 $ par personne**
- 🏆 Progression plafonnée à 100 %
- 📅 Agenda des absences
- 🤝 Gestion et suivi des partenariats
- 🔗 Génération de liens d'accès client
- ⚙️ Centre développeur
- 🧾 Journal d'audit

## Sécurité

- Les routes publiques sont limitées à `DEFAULT_GUILD_ID`.
- Les sessions employé vérifient les rôles Discord et les permissions configurées.
- Les liens partenaires utilisent un token stocké sous forme de hash SHA-256.
- OAuth partenaire utilise un état anti-CSRF.
- Rate limit public basique par IP.
- Upload limité à 8 Mo par fichier et aux images/PDF.
- SQLite en WAL.
- Les actions importantes sont auditées.

## Installation

```bash
npm install
copy .env.example .env
npm start
```

## Variables .env

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback
PLAYER_REDIRECT_URI=http://localhost:3000/auth/player/callback
PARTNERSHIP_REDIRECT_URI=http://localhost:3000/auth/partnership/callback
SESSION_SECRET=change-me
PORT=3000
BASE_URL=http://localhost:3000
DEFAULT_GUILD_ID=
LS_CUSTOM_ROLE_ID=1282014203053478011
LS_CUSTOM_ADMIN_ROLE_NAMES=gerant legal,developpeur site
PARTNERSHIP_TICKET_CATEGORY_ID=1549137158919430255
FIVEM_SERVER_URL=
FIVEM_MAX_PLAYERS=48
```

## Discord Developer Portal

Déclarer les redirect URIs réellement utilisées :

- `DISCORD_REDIRECT_URI`
- `PLAYER_REDIRECT_URI`
- `PARTNERSHIP_REDIRECT_URI`

Le bot doit pouvoir lire et envoyer des messages dans les salons concernés et accéder aux salons Ticket Tool utilisés pour les partenariats.

## Commandes Discord

- `/connexion` — connexion employé par code temporaire
- `/recrutement ouvrir`
- `/recrutement fermer`
- `/config`
- `/candidatures`

## Structure

- `src/bot.js` — Discord, publications, notifications et synchronisation
- `src/dashboard.js` — serveur web, sessions, OAuth2 et API
- `src/db.js` — SQLite, données, permissions, quotas et audit
- `src/index.js` — démarrage
- `public/ls-custom-theme.css` — thème partagé
- `public/ls-custom-app.js` — shell, sidebar et profil partagé
- `public/portal.*` — portail public
- `public/public-recrutements.*` — liste publique des recrutements
- `public/public-recrutement.*` — candidature publique
- `public/public-suivi.*` — suivi public
- `public/organisation.*` — dashboard
- `public/recrutements.*` — équipe
- `public/recrutement.*` — activité et quotas
- `public/agenda-board.*` — agenda RH
- `public/tracking.*` — partenariats staff
- `public/partenariat-client.*` — espace client partenaire
- `public/developpeur.*` — centre développeur
- `public/podium.html` — podium public

## Production

1. HTTPS obligatoire.
2. `SESSION_SECRET` long et aléatoire.
3. Remplacer le MemoryStore Express par un vrai session store.
4. Sauvegarder `data/redside.sqlite` et `data/uploads`.
5. Placer le site derrière un reverse proxy.
6. Vérifier les permissions Discord du bot et les redirect URIs OAuth2.
