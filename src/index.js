"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pnj_1 = require("./pnj");
const api_1 = require("./api");
// Message de bienvenue
console.log('=================================================');
console.log('   SYSTÈME DE SIMULATION DE PNJ - OPEN WORLD    ');
console.log('=================================================');
console.log('Initialisation du système...');
// Initialiser les dossiers nécessaires
(0, pnj_1.initialiserDossiers)();
// Démarrer le serveur
(0, api_1.demarrerServeur)();
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
