import { demarrerServeur } from './api-typed';
import { initialiserDossiers } from './pnj';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Initialiser les dossiers de données
initialiserDossiers();

// Démarrer le serveur
demarrerServeur(); 