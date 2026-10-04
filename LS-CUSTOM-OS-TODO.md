# LS CUSTOM OS — feuille de route complète

## Phase 1 — Socle & sécurité
- [x] Sessions sécurisées, cookie HttpOnly/SameSite/Secure en production
- [x] Régénération de session après authentification
- [x] OAuth Discord avec state anti-CSRF
- [x] Limitation des tentatives de codes
- [x] Liens de connexion persistants expirables et révocables
- [x] Protection d'origine des requêtes d'état
- [x] Headers de sécurité
- [x] Uploads avec noms générés et limites
- [x] Centre sécurité : sessions + audit
- [ ] Ajouter une vraie page de révocation globale des sessions
- [ ] Ajouter alertes de sécurité en temps réel

## Phase 2 — Cockpit
- [x] Centre de pilotage /pilotage
- [x] KPIs
- [x] Analytics 7 jours
- [x] Classement activité
- [x] État Discord
- [x] Uptime
- [x] Notifications
- [x] Audit
- [ ] Graphiques historiques 30/90 jours
- [ ] Comparaison semaine/mois précédent

## Phase 3 — RH
- [x] Mesures RH : avertissement, blâme, mise à pied, exclusion
- [x] Historique des sanctions
- [x] Notifications de sanction
- [ ] Fiche employé 360°
- [ ] Historique d'évolution de grade
- [ ] Historique complet des absences
- [ ] Export RH PDF/CSV
- [ ] Validation RH à plusieurs niveaux

## Phase 4 — Performance
- [x] Badges
- [x] Recalcul automatique des badges
- [x] Quota Master / Top Performer / Repair Pro / Fourrière Pro / Ultra Actif
- [ ] Employé du mois
- [ ] Objectifs personnalisés par période
- [ ] Alertes quota faible
- [ ] Prévision de fin de période

## Phase 5 — Discord
- [x] Association Discord ↔ profil RP par ID
- [x] Détection des doublons
- [x] Liens de connexion DM
- [x] Synchronisation des identités
- [ ] Synchronisation périodique sans rate-limit
- [ ] Synchronisation des grades
- [ ] Détection des membres partis
- [ ] Centre des conflits de synchronisation

## Phase 6 — Communication
- [x] Messagerie interne
- [x] Annonces
- [x] Notifications
- [ ] Centre de notifications global
- [ ] Push navigateur
- [ ] Notifications Discord contextualisées
- [ ] Mentions @équipe / @RH / @direction

## Phase 7 — Agenda
- [x] Absences personnelles
- [x] Agenda RH
- [ ] Calendrier mensuel complet
- [ ] Congés
- [ ] Mise à pied
- [ ] Indisponibilités
- [ ] Rappels automatiques

## Phase 8 — Développeur
- [x] Rôles & permissions
- [x] Comptes de connexion
- [x] Comptes démo
- [x] Purges protégées
- [x] Audit
- [ ] Maintenance DB
- [ ] Vérification d'intégrité SQLite
- [ ] Sauvegarde/restauration
- [ ] Santé Discord/DB/session
- [ ] Nettoyage automatique des sessions expirées

## Phase 9 — Mobile
- [x] Sidebar desktop / dock mobile
- [x] Responsive global
- [x] Pilotage mobile
- [x] PWA de base
- [ ] Installation PWA guidée
- [ ] Mode hors-ligne lecture seule
- [ ] Notifications push

## Phase 10 — Qualité
- [ ] Tests API d'authentification
- [ ] Tests permissions par rôle
- [ ] Tests multi-guild isolation
- [ ] Tests anti-doublons
- [ ] Tests imports quotas
- [ ] Tests purge
- [ ] Tests uploads
- [ ] Lint + syntax check dans CI
- [ ] Smoke test automatique avant déploiement
