# Projet OpenWorld - Simulation de PNJ avec IA

Ce projet est une preuve de concept (POC) pour la simulation de Personnages Non Joueurs (PNJ) dans un monde virtuel, avec l'aide de l'IA pour générer des comportements, des dialogues et des backgrounds réalistes.

## Structure du projet

Le projet est organisé en plusieurs modules :

- **types.ts** : Définition des interfaces et types utilisés dans tout le projet
- **pnj.ts** : Gestion des PNJs (création, sauvegarde, chargement, comportements)
- **environnement.ts** : Gestion de l'environnement virtuel (bâtiments, météo, temps)
- **ia.ts** : Intégration avec l'API OpenAI pour générer du contenu (dialogues, backgrounds)
- **simulation.ts** : Logique de simulation du monde et des comportements des PNJs
- **api.ts** : Serveur Express pour exposer une API REST
- **index.ts** : Point d'entrée de l'application

## Fonctionnalités

- Création et gestion de PNJs avec des personnalités distinctes
- Simulation d'un environnement avec différents bâtiments et services
- Gestion des besoins des PNJs (faim, sommeil, socialisation, etc.)
- Planification automatique des emplois du temps en fonction de la profession
- Génération de backgrounds et de dialogues réalistes grâce à l'IA
- API REST pour interagir avec la simulation

## Démarrage

1. Installer les dépendances : `npm install`
2. Lancer l'application : `npm start`
3. Accéder à l'API : http://localhost:3000

## Routes API

- **GET /api/pnjs** : Liste tous les PNJs
- **GET /api/pnjs/:id** : Détails d'un PNJ spécifique
- **POST /api/pnjs** : Créer un nouveau PNJ
- **DELETE /api/pnjs/:id** : Supprimer un PNJ
- **POST /api/dialogues** : Générer un dialogue entre deux PNJs
- **GET /api/simulation/etat** : État actuel de la simulation
- **POST /api/simulation/demarrer** : Démarrer la simulation
- **POST /api/simulation/arreter** : Arrêter la simulation

## Version avec types explicites (pour Express 5)

Une version alternative de l'API avec des types explicites pour Express 5 est disponible. Cette version résout les problèmes de typage avec Express 5 en utilisant les types génériques pour les requêtes et réponses.

### Utilisation de la version typée

1. **Compilation avec le script dédié** :
   ```bash
   chmod +x compile-typed.sh
   ./compile-typed.sh
   ```

2. **Lancement de l'application** :
   ```bash
   npm start
   ```

3. **Ou en mode développement** :
   ```bash
   npm run dev -- --exec "ts-node" src/index-typed.ts
   ```

### Fichiers de la version typée

- **api-typed.ts** : Version de l'API avec types explicites
- **index-typed.ts** : Point d'entrée utilisant l'API typée
- **compile-typed.sh** : Script de compilation pour la version typée

Cette version utilise des interfaces dédiées pour les requêtes et des types génériques pour Express, permettant une meilleure sécurité de typage et compatibilité avec Express 5. 