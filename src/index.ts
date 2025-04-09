import { initialiserDossiers } from './pnj';
import { demarrerServeur } from './api';

// Message de bienvenue
console.log('=================================================');
console.log('   SYSTÈME DE SIMULATION DE PNJ - OPEN WORLD    ');
console.log('=================================================');
console.log('Initialisation du système...');

// Initialiser les dossiers nécessaires
initialiserDossiers();

// Démarrer le serveur
demarrerServeur();

// Gestionnaire d'arrêt propre
process.on('SIGINT', () => {
  console.log('\nArrêt du système...');
  process.exit(0);
});

// Gestionnaire d'erreurs non gérées
process.on('uncaughtException', (err) => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});
