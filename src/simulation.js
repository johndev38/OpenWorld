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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulation = exports.Simulation = exports.TICK_INTERVAL = void 0;
exports.simulerTick = simulerTick;
exports.demarrerSimulation = demarrerSimulation;
exports.arreterSimulation = arreterSimulation;
exports.etatSimulation = etatSimulation;
exports.ajouterPNJ = ajouterPNJ;
exports.retirerPNJ = retirerPNJ;
exports.getPNJs = getPNJs;
exports.getPNJById = getPNJById;
exports.testerScenarios = testerScenarios;
const pnj_1 = require("./pnj");
const environnement_1 = require("./environnement");
const behaviorTree_1 = require("./behaviorTree");
const evenements_1 = require("./evenements");
const config_1 = require("./config");
const DeplacementService_1 = require("./services/DeplacementService");
const PNJDecisionService_1 = require("./services/PNJDecisionService");
const PathfindingService_1 = require("./services/PathfindingService");
const BatimentService_1 = require("./services/BatimentService");
const events_1 = __importDefault(require("events"));
// Variable de contrôle de la simulation
let simulationActive = false;
let intervalId = null;
let pnjs = [];
let dernierEvenement = 0;
// Constante pour l'intervalle de simulation
exports.TICK_INTERVAL = 10000; // 10 secondes par tick
class Simulation extends events_1.default {
    constructor() {
        super();
        this.pnjs = [];
        this.intervalId = null;
        this.enPause = true;
        // Configuration de simulation
        this.intervalTemps = 1000; // ms entre chaque tick
        this.minutesParTick = 5; // minutes qui passent par tick
        this.deplacementService = DeplacementService_1.DeplacementService.getInstance();
        this.pnjDecisionService = PNJDecisionService_1.PNJDecisionService.getInstance();
        this.pathfindingService = PathfindingService_1.PathfindingService.getInstance();
        this.batimentService = BatimentService_1.BatimentService.getInstance();
        // Configurer les écouteurs d'événements
        this.deplacementService.on('arrivee', this.handlePNJArrivee.bind(this));
        // Initialiser l'environnement
        (0, environnement_1.initialiserEnvironnement)();
        // Initialiser la carte de pathfinding avec les bâtiments
        this.mettreAJourCartePathfinding();
    }
    static getInstance() {
        if (!Simulation.instance) {
            Simulation.instance = new Simulation();
        }
        return Simulation.instance;
    }
    /**
     * Définit les PNJ à simuler
     */
    setPNJs(pnjs) {
        this.pnjs = pnjs;
        console.log(`Simulation configurée avec ${pnjs.length} PNJs`);
    }
    /**
     * Démarre la simulation
     */
    demarrer() {
        if (!this.enPause)
            return;
        this.enPause = false;
        console.log("Démarrage de la simulation...");
        this.intervalId = setInterval(() => {
            this.tick();
        }, this.intervalTemps);
        this.emit('simulation:demarree');
    }
    /**
     * Met en pause la simulation
     */
    pause() {
        if (this.enPause)
            return;
        this.enPause = true;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log("Simulation en pause");
        this.emit('simulation:pause');
    }
    /**
     * Réinitialise la simulation
     */
    reinitialiser() {
        this.pause();
        (0, environnement_1.initialiserEnvironnement)();
        this.mettreAJourCartePathfinding();
        console.log("Simulation réinitialisée");
        this.emit('simulation:reinitialisee');
    }
    /**
     * Exécute un tick de simulation
     */
    tick() {
        // Avancer le temps
        (0, environnement_1.avancerTemps)(this.minutesParTick);
        // Mettre à jour les besoins des PNJ
        (0, environnement_1.mettreAJourBesoinsPNJ)(this.pnjs, this.minutesParTick);
        // Mettre à jour les déplacements en cours
        this.deplacementService.mettreAJourDeplacements(this.pnjs);
        // Pour chaque PNJ, prendre des décisions en fonction des besoins
        this.pnjs.forEach(pnj => {
            this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
                .then(decisionPrise => {
                if (decisionPrise) {
                    console.log(`${pnj.nom} a pris une nouvelle décision`);
                }
            });
        });
        // Émettre un événement tick
        this.emit('simulation:tick', (0, environnement_1.getEnvironnement)());
    }
    /**
     * Gère l'arrivée d'un PNJ à sa destination
     */
    handlePNJArrivee(pnj, batimentId) {
        if (batimentId) {
            // Entrer dans le bâtiment
            console.log(`${pnj.nom} est arrivé à ${batimentId} et tente d'y entrer`);
            // Vérifier si le PNJ peut entrer dans le bâtiment
            const batiment = this.batimentService.getBatiment(batimentId);
            if (batiment && batiment.occupants.length < batiment.capacite) {
                // Mettre à jour la localisation du PNJ
                pnj.localisation.batimentId = batiment.id;
                pnj.localisation.exterieur = false;
                // Ajouter le PNJ aux occupants du bâtiment
                this.batimentService.ajouterOccupant(batiment.id, pnj.id);
                console.log(`${pnj.nom} est entré dans ${batiment.nom}`);
                // Satisfaire les besoins du PNJ
                this.pnjDecisionService.satisfaireBesoin(pnj, batiment.id);
            }
            else {
                console.log(`${pnj.nom} n'a pas pu entrer dans le bâtiment (plein ou fermé)`);
            }
        }
        this.emit('pnj:arrive', pnj, batimentId);
    }
    /**
     * Met à jour la carte de pathfinding avec les bâtiments actuels
     */
    mettreAJourCartePathfinding() {
        const batiments = this.batimentService.getAllBatiments();
        this.pathfindingService.mettreAJourCarte(batiments);
        console.log(`Carte de pathfinding mise à jour avec ${batiments.length} bâtiments`);
    }
    /**
     * Simule une urgence de santé pour un PNJ
     */
    simulerUrgenceSante(pnj) {
        // Diminuer drastiquement la santé du PNJ
        pnj.sante = 10;
        console.log(`URGENCE: ${pnj.nom} a un problème de santé (santé: ${pnj.sante})`);
        // Forcer une évaluation immédiate des besoins
        this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
            .then(decisionPrise => {
            if (decisionPrise) {
                console.log(`${pnj.nom} cherche de l'aide médicale`);
                this.emit('pnj:urgence', pnj);
            }
        });
    }
    /**
     * Simule une forte faim pour un PNJ
     */
    simulerFaim(pnj) {
        // Diminuer drastiquement la nourriture du PNJ
        pnj.besoins.faim = 5;
        console.log(`ALERTE: ${pnj.nom} a très faim (faim: ${pnj.besoins.faim})`);
        // Forcer une évaluation immédiate des besoins
        this.pnjDecisionService.evaluerBesoinsEtDecider(pnj)
            .then(decisionPrise => {
            if (decisionPrise) {
                console.log(`${pnj.nom} cherche à manger`);
                this.emit('pnj:faim', pnj);
            }
        });
    }
}
exports.Simulation = Simulation;
exports.simulation = Simulation.getInstance();
// Fonction pour générer un événement aléatoire
function genererEtAjouterEvenement() {
    return __awaiter(this, void 0, void 0, function* () {
        // Vérifier la probabilité qu'un événement se produise
        const probabilite = Math.random() * 100;
        if (probabilite > config_1.EVENEMENTS_PROBABILITE) {
            console.log(`Aucun événement généré cette fois-ci (probabilité: ${config_1.EVENEMENTS_PROBABILITE}%)`);
            return;
        }
        const environnement = (0, environnement_1.getEnvironnement)();
        // Génération de l'événement par l'IA
        const nouvelEvenement = yield (0, evenements_1.genererEvenementAleatoire)(pnjs, environnement);
        if (nouvelEvenement) {
            // Ajouter l'événement à la liste des événements actifs
            (0, evenements_1.ajouterEvenement)(nouvelEvenement);
            console.log(`=== NOUVEL ÉVÉNEMENT GÉNÉRÉ ===`);
            console.log(`Type: ${nouvelEvenement.type}`);
            console.log(`Description: ${nouvelEvenement.description}`);
            console.log(`Personnages impliqués: ${nouvelEvenement.pnjsImpliques.map(id => {
                const pnj = pnjs.find(p => p.id === id);
                return pnj ? pnj.nom : id;
            }).join(', ')}`);
            console.log(`Durée prévue: ${nouvelEvenement.duree} minutes`);
            console.log(`================================`);
        }
    });
}
// Fonction pour simuler un tick de la simulation
function simulerTick() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- NOUVEAU TICK DE SIMULATION ---");
        // Faire avancer le temps dans l'environnement
        (0, environnement_1.avancerTemps)(30); // Avancer de 30 minutes par tick
        const environnement = (0, environnement_1.getEnvironnement)();
        const evenementsActifs = (0, evenements_1.getEvenementsActifs)();
        // Vérifier s'il faut générer un nouvel événement
        const tickActuel = Math.floor(Date.now() / exports.TICK_INTERVAL);
        if (tickActuel - dernierEvenement >= config_1.EVENEMENTS_INTERVALLE) {
            yield genererEtAjouterEvenement();
            dernierEvenement = tickActuel;
        }
        // Afficher les événements actifs
        if (evenementsActifs.length > 0) {
            console.log(`\n=== ÉVÉNEMENTS ACTIFS (${evenementsActifs.length}) ===`);
            evenementsActifs.forEach(evt => {
                const tempsEcoule = Math.floor((Date.now() - evt.timestampDebut) / (60 * 1000));
                console.log(`- ${evt.type}: ${evt.description} (Durée: ${tempsEcoule}/${evt.duree} min)`);
            });
            console.log(`====================================\n`);
        }
        // Appliquer les impacts des événements actifs sur les PNJ
        (0, evenements_1.appliquerEvenementsAuxPNJ)(pnjs);
        // Contexte partagé pour l'arbre de comportement
        const context = {
            environnement,
            pnjs,
            timestamp: Date.now(),
            evenements: evenementsActifs
        };
        // Mettre à jour chaque PNJ avec l'arbre de comportement
        for (const pnj of pnjs) {
            console.log(`\nTraitement du PNJ ${pnj.nom}:`);
            console.log(`État actuel: ${pnj.etatActuel.activite}`);
            console.log(`Besoins: Faim(${pnj.besoins.faim}), Fatigue(${pnj.besoins.fatigue}), Social(${pnj.besoins.social}), Énergie(${pnj.besoins.energie}), Divertissement(${pnj.besoins.divertissement}), Soif(${pnj.besoins.soif})`);
            // Réduction naturelle des besoins
            pnj.besoins.faim = Math.max(0, pnj.besoins.faim - 2);
            pnj.besoins.social = Math.max(0, pnj.besoins.social - 1);
            pnj.besoins.fatigue = Math.max(0, pnj.besoins.fatigue - 3);
            pnj.besoins.energie = Math.max(0, pnj.besoins.energie - 2);
            pnj.besoins.divertissement = Math.max(0, pnj.besoins.divertissement - 2);
            pnj.besoins.soif = Math.max(0, pnj.besoins.soif - 2);
            // Exécuter l'arbre de comportement avec le contexte
            yield (0, behaviorTree_1.executerArbreComportement)(pnj, context);
            // Augmentation des besoins selon l'activité actuelle
            switch (pnj.etatActuel.activite) {
                case 'repas':
                    pnj.besoins.faim = Math.min(100, pnj.besoins.faim + 15);
                    break;
                case 'repos':
                    pnj.besoins.fatigue = Math.min(100, pnj.besoins.fatigue + 20);
                    pnj.besoins.energie = Math.min(100, pnj.besoins.energie + 10);
                    break;
                case 'social':
                    pnj.besoins.social = Math.min(100, pnj.besoins.social + 15);
                    pnj.besoins.divertissement = Math.min(100, pnj.besoins.divertissement + 5);
                    break;
                case 'loisir':
                    pnj.besoins.divertissement = Math.min(100, pnj.besoins.divertissement + 20);
                    pnj.besoins.energie = Math.min(100, pnj.besoins.energie + 5);
                    break;
                case 'travail':
                    // Le travail peut être légèrement socialisant
                    pnj.besoins.social = Math.min(100, pnj.besoins.social + 3);
                    // Mais il consomme de l'énergie
                    pnj.besoins.energie = Math.max(0, pnj.besoins.energie - 3);
                    break;
            }
            // Afficher un bilan
            console.log(`Après traitement: État = ${pnj.etatActuel.activite}`);
            console.log(`Besoins mis à jour: Faim(${pnj.besoins.faim}), Fatigue(${pnj.besoins.fatigue}), Social(${pnj.besoins.social}), Énergie(${pnj.besoins.energie}), Divertissement(${pnj.besoins.divertissement}), Soif(${pnj.besoins.soif})`);
            // Sauvegarder l'état du PNJ
            (0, pnj_1.sauvegarderPNJ)(pnj);
        }
    });
}
// Démarrer la simulation
function demarrerSimulation() {
    if (simulationActive) {
        console.log("La simulation est déjà en cours.");
        return;
    }
    simulationActive = true;
    console.log("Démarrage de la simulation.");
    // Exécuter immédiatement un premier tick
    simulerTick();
    // Puis configurer l'intervalle
    intervalId = setInterval(() => {
        simulerTick();
    }, exports.TICK_INTERVAL);
}
// Arrêter la simulation
function arreterSimulation() {
    if (!simulationActive) {
        console.log("La simulation n'est pas en cours.");
        return;
    }
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    simulationActive = false;
    console.log("Simulation arrêtée.");
}
// État de la simulation
function etatSimulation() {
    return {
        actif: simulationActive,
        nbPNJs: pnjs.length
    };
}
// Ajouter un PNJ à la simulation
function ajouterPNJ(pnj) {
    pnjs.push(pnj);
    (0, pnj_1.sauvegarderPNJ)(pnj);
    console.log(`PNJ ${pnj.nom} ajouté à la simulation.`);
}
// Retirer un PNJ de la simulation
function retirerPNJ(id) {
    const index = pnjs.findIndex(p => p.id === id);
    if (index !== -1) {
        pnjs.splice(index, 1);
        console.log(`PNJ avec ID ${id} retiré de la simulation.`);
        return true;
    }
    return false;
}
// Obtenir tous les PNJs actuels
function getPNJs() {
    return [...pnjs]; // Retourne une copie pour éviter des modifications externes directes
}
// Obtenir un PNJ par son ID
function getPNJById(id) {
    return pnjs.find(p => p.id === id);
}
// Créer des scénarios de test pour valider l'arbre de comportement
function testerScenarios() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("--- LANCEMENT DES SCÉNARIOS DE TEST ---");
        // Vérifier qu'il y a des PNJs à tester
        if (pnjs.length === 0) {
            console.log("Aucun PNJ disponible pour les tests. Veuillez d'abord ajouter des PNJs.");
            return;
        }
        // Environnement et contexte partagés
        const environnement = (0, environnement_1.getEnvironnement)();
        const context = {
            environnement,
            pnjs,
            timestamp: Date.now()
        };
        // SCÉNARIO 1: Besoin social critique
        console.log("\n--- SCÉNARIO 1: BESOIN SOCIAL CRITIQUE ---");
        const pnjSocial = pnjs[0];
        console.log(`Test avec PNJ: ${pnjSocial.nom}`);
        // Forcer le besoin social à être critique
        pnjSocial.besoins.social = 10; // Bien en-dessous du seuil critique
        // Mémoriser l'état actuel pour la comparaison
        const etatAvantSocial = pnjSocial.etatActuel.activite;
        console.log(`État avant: ${etatAvantSocial}`);
        console.log(`Besoins avant: Faim(${pnjSocial.besoins.faim}), Social(${pnjSocial.besoins.social}), Fatigue(${pnjSocial.besoins.fatigue})`);
        // Exécuter l'arbre de comportement
        yield (0, behaviorTree_1.executerArbreComportement)(pnjSocial, context);
        console.log(`État après: ${pnjSocial.etatActuel.activite}`);
        console.log(`Le PNJ devrait chercher à socialiser: ${pnjSocial.etatActuel.activite === 'social' ? 'RÉUSSI' : 'ÉCHEC'}`);
        // Restaurer l'état
        pnjSocial.besoins.social = 70;
        // SCÉNARIO 2: Choix entre manger et dormir
        console.log("\n--- SCÉNARIO 2: CHOIX ENTRE MANGER ET DORMIR ---");
        const pnjChoix = pnjs.length > 1 ? pnjs[1] : pnjs[0];
        console.log(`Test avec PNJ: ${pnjChoix.nom}`);
        // Forcer les deux besoins à être critiques, mais fatigue plus critique
        pnjChoix.besoins.faim = 25; // En-dessous du seuil critique
        pnjChoix.besoins.fatigue = 15; // Bien en-dessous du seuil critique
        // Mémoriser l'état actuel
        const etatAvantChoix = pnjChoix.etatActuel.activite;
        console.log(`État avant: ${etatAvantChoix}`);
        console.log(`Besoins avant: Faim(${pnjChoix.besoins.faim}), Fatigue(${pnjChoix.besoins.fatigue})`);
        // Exécuter l'arbre de comportement
        yield (0, behaviorTree_1.executerArbreComportement)(pnjChoix, context);
        console.log(`État après: ${pnjChoix.etatActuel.activite}`);
        console.log(`Le PNJ devrait prioritairement se reposer: ${pnjChoix.etatActuel.activite === 'repos' ? 'RÉUSSI' : 'ÉCHEC'}`);
        // Restaurer l'état
        pnjChoix.besoins.faim = 70;
        pnjChoix.besoins.fatigue = 70;
        // SCÉNARIO 3: Influence de la personnalité
        console.log("\n--- SCÉNARIO 3: INFLUENCE DE LA PERSONNALITÉ ---");
        const pnjPersonnalite = pnjs[0];
        // Sauvegarder la personnalité actuelle
        const personnaliteOriginale = pnjPersonnalite.personnalite;
        // Tester avec personnalité extravertie
        pnjPersonnalite.personnalite = "jovial";
        console.log(`Test avec PNJ: ${pnjPersonnalite.nom} (${pnjPersonnalite.personnalite})`);
        // S'assurer que tous les besoins sont satisfaits
        pnjPersonnalite.besoins.faim = 80;
        pnjPersonnalite.besoins.fatigue = 80;
        pnjPersonnalite.besoins.social = 80;
        pnjPersonnalite.besoins.energie = 80;
        pnjPersonnalite.besoins.divertissement = 80;
        pnjPersonnalite.besoins.soif = 80;
        // Exécuter l'arbre de comportement
        yield (0, behaviorTree_1.executerArbreComportement)(pnjPersonnalite, context);
        console.log(`État avec personnalité joviale: ${pnjPersonnalite.etatActuel.activite}`);
        // Tester avec personnalité ambitieuse
        pnjPersonnalite.personnalite = "strict";
        console.log(`Test avec PNJ: ${pnjPersonnalite.nom} (${pnjPersonnalite.personnalite})`);
        // Exécuter l'arbre de comportement
        yield (0, behaviorTree_1.executerArbreComportement)(pnjPersonnalite, context);
        console.log(`État avec personnalité stricte: ${pnjPersonnalite.etatActuel.activite}`);
        // Restaurer la personnalité originale
        pnjPersonnalite.personnalite = personnaliteOriginale;
        // SCÉNARIO 4: Influence de l'heure
        console.log("\n--- SCÉNARIO 4: INFLUENCE DE L'HEURE ---");
        const pnjHeure = pnjs.length > 2 ? pnjs[2] : pnjs[0];
        console.log(`Test avec PNJ: ${pnjHeure.nom}`);
        // S'assurer que tous les besoins sont satisfaits
        pnjHeure.besoins.faim = 80;
        pnjHeure.besoins.fatigue = 80;
        pnjHeure.besoins.social = 80;
        pnjHeure.besoins.energie = 80;
        pnjHeure.besoins.divertissement = 80;
        pnjHeure.besoins.soif = 80;
        // Tester avec différentes heures
        const heuresTest = [9, 13, 21, 23];
        for (const heure of heuresTest) {
            // Modifier l'heure dans le contexte
            context.environnement.heure = heure;
            console.log(`Test à ${heure}h00:`);
            // Exécuter l'arbre de comportement
            yield (0, behaviorTree_1.executerArbreComportement)(pnjHeure, context);
            console.log(`État à ${heure}h00: ${pnjHeure.etatActuel.activite}`);
        }
        // Restaurer l'heure correcte
        context.environnement.heure = environnement.heure;
        console.log("\n--- FIN DES SCÉNARIOS DE TEST ---");
    });
}
