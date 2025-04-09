"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const simulationPathfinding_1 = require("./simulationPathfinding");
const environnement_1 = require("./environnement");
// Fonction pour charger ou créer un PNJ de test
function creerPNJTest() {
    const pnj = {
        id: 'test-pnj-1',
        nom: 'Jean Testeur',
        age: 35,
        profession: 'forgeron',
        personnalite: 'amical',
        localisation: {
            exterieur: true,
            position: { x: 0, y: 0 } // Position de départ
        },
        sante: 90,
        bonheur: 70,
        background: 'Un forgeron expérimenté qui a grandi dans le village.',
        besoins: {
            faim: 70,
            soif: 80,
            fatigue: 60,
            social: 50,
            divertissement: 40,
            energie: 75
        },
        etatActuel: {
            activite: 'repos'
        },
        historique: [
            {
                timestamp: Date.now(),
                etat: { activite: 'repos' },
                action: 'Jean commence sa journée.'
            }
        ],
        energie: 80
    };
    return pnj;
}
// Fonction de démonstration d'une urgence de santé
function demontrerUrgenceSante(pnj) {
    console.log("\n--- DÉMONSTRATION: URGENCE DE SANTÉ ---");
    console.log(`État initial de ${pnj.nom}: Santé = ${pnj.sante}`);
    // Simuler une urgence de santé
    simulationPathfinding_1.simulationPathfinding.simulerUrgenceSante(pnj);
    console.log("Le PNJ va maintenant chercher un bâtiment offrant des soins...");
}
// Fonction de démonstration d'une forte faim
function demontrerFaim(pnj) {
    console.log("\n--- DÉMONSTRATION: FAIM ---");
    console.log(`État initial de ${pnj.nom}: Faim = ${pnj.besoins.faim}`);
    // Simuler une forte faim
    simulationPathfinding_1.simulationPathfinding.simulerFaim(pnj);
    console.log("Le PNJ va maintenant chercher un endroit où manger...");
}
// Fonction principale
function demarrerDemonstration() {
    return __awaiter(this, void 0, void 0, function* () {
        // S'assurer que l'environnement est initialisé
        (0, environnement_1.initialiserEnvironnement)();
        // Créer un PNJ de test
        const pnj = creerPNJTest();
        console.log(`📋 INITIALISATION: PNJ de test créé - ${pnj.nom} (${pnj.profession})`);
        console.log(`📊 ÉTAT INITIAL: Position: [${pnj.localisation.position.x}, ${pnj.localisation.position.y}], Santé: ${pnj.sante}, Faim: ${pnj.besoins.faim}, Activité: ${pnj.etatActuel.activite}`);
        // Configurer la simulation avec ce PNJ
        simulationPathfinding_1.simulationPathfinding.setPNJs([pnj]);
        // Écouter les événements de la simulation
        simulationPathfinding_1.simulationPathfinding.on('pnj:arrive', (pnj, batimentId) => {
            console.log(`\n🏁 ÉVÉNEMENT: ${pnj.nom} est arrivé à destination ${batimentId ? `(${batimentId})` : ''}`);
            console.log(`📍 POSITION: [${pnj.localisation.position.x}, ${pnj.localisation.position.y}]`);
            console.log(`📊 ÉTAT: Santé: ${pnj.sante}, Faim: ${pnj.besoins.faim}, Activité: ${pnj.etatActuel.activite}`);
        });
        simulationPathfinding_1.simulationPathfinding.on('pnj:urgence', (pnj) => {
            console.log(`\n🚨 ÉVÉNEMENT: Urgence déclenchée pour ${pnj.nom}`);
            console.log(`📍 POSITION: [${pnj.localisation.position.x}, ${pnj.localisation.position.y}]`);
            console.log(`📊 ÉTAT: Santé: ${pnj.sante}, Faim: ${pnj.besoins.faim}, Activité: ${pnj.etatActuel.activite}`);
        });
        simulationPathfinding_1.simulationPathfinding.on('pnj:faim', (pnj) => {
            console.log(`\n🍽️ ÉVÉNEMENT: Alerte de faim déclenchée pour ${pnj.nom}`);
            console.log(`📍 POSITION: [${pnj.localisation.position.x}, ${pnj.localisation.position.y}]`);
            console.log(`📊 ÉTAT: Santé: ${pnj.sante}, Faim: ${pnj.besoins.faim}, Activité: ${pnj.etatActuel.activite}`);
        });
        simulationPathfinding_1.simulationPathfinding.on('simulation:tick', (environnement) => {
            console.log(`\n⏱️ TICK: Jour ${environnement.jour}, ${environnement.heure}:${environnement.minute.toString().padStart(2, '0')} - Météo: ${environnement.meteo}`);
            console.log(`📍 POSITION DE ${pnj.nom}: [${pnj.localisation.position.x}, ${pnj.localisation.position.y}]${pnj.localisation.batimentId ? ` (dans ${pnj.localisation.batimentId})` : ' (extérieur)'}`);
            console.log(`📊 BESOINS: Faim: ${pnj.besoins.faim}, Soif: ${pnj.besoins.soif}, Fatigue: ${pnj.besoins.fatigue}, Social: ${pnj.besoins.social}, Divertissement: ${pnj.besoins.divertissement}`);
            console.log(`❤️ SANTÉ: ${pnj.sante}, Énergie: ${pnj.energie}, Bonheur: ${pnj.bonheur}`);
            console.log(`🧠 ACTIVITÉ: ${pnj.etatActuel.activite}${pnj.etatActuel.batimentCible ? ` (destination: ${pnj.etatActuel.batimentCible})` : ''}`);
        });
        // Démarrer la simulation
        console.log("=== 🚀 DÉMARRAGE DE LA DÉMONSTRATION DE PATHFINDING ===");
        simulationPathfinding_1.simulationPathfinding.demarrer();
        // Attendre 10 secondes avant de simuler une urgence
        setTimeout(() => {
            demontrerUrgenceSante(pnj);
        }, 10000);
        // Attendre 30 secondes avant de simuler une faim
        setTimeout(() => {
            demontrerFaim(pnj);
        }, 30000);
        // Arrêter la simulation après 60 secondes
        setTimeout(() => {
            simulationPathfinding_1.simulationPathfinding.pause();
            console.log("\n=== 🏁 FIN DE LA DÉMONSTRATION ===");
            // Afficher l'historique du PNJ
            console.log("\n📜 HISTORIQUE DES ACTIONS DU PNJ:");
            pnj.historique.forEach((entry, index) => {
                const date = new Date(entry.timestamp);
                console.log(`${index + 1}. [${date.toLocaleTimeString()}] ${entry.action} (Activité: ${entry.etat.activite})`);
            });
            // Afficher un résumé final
            console.log("\n📊 RÉSUMÉ FINAL:");
            console.log(`Position finale: [${pnj.localisation.position.x}, ${pnj.localisation.position.y}]${pnj.localisation.batimentId ? ` (dans ${pnj.localisation.batimentId})` : ' (extérieur)'}`);
            console.log(`Besoins: Faim: ${pnj.besoins.faim}, Soif: ${pnj.besoins.soif}, Fatigue: ${pnj.besoins.fatigue}, Social: ${pnj.besoins.social}`);
            console.log(`Santé: ${pnj.sante}, Énergie: ${pnj.energie}, Bonheur: ${pnj.bonheur}`);
            console.log(`Activité finale: ${pnj.etatActuel.activite}`);
            console.log(`Nombre d'actions réalisées: ${pnj.historique.length}`);
        }, 60000);
    });
}
// Lancer la démonstration
demarrerDemonstration().catch(console.error);
