"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeplacementService = void 0;
const PathfindingService_1 = require("./PathfindingService");
const BatimentService_1 = require("./BatimentService");
const events_1 = __importDefault(require("events"));
class DeplacementService extends events_1.default {
    constructor() {
        super();
        this.deplacements = new Map();
        // Vitesse de déplacement des PNJ (cases par tick)
        this.vitesseDeplacement = 1;
        this.pathfinding = PathfindingService_1.PathfindingService.getInstance();
        this.batimentService = BatimentService_1.BatimentService.getInstance();
    }
    static getInstance() {
        if (!DeplacementService.instance) {
            DeplacementService.instance = new DeplacementService();
        }
        return DeplacementService.instance;
    }
    /**
     * Déplace un PNJ vers une destination
     */
    deplacerVers(pnj, destination, batimentCible) {
        return new Promise((resolve) => {
            // Si le PNJ est déjà à destination, on ne fait rien
            if (this.estADestination(pnj.localisation.position, destination)) {
                console.log(`${pnj.nom} est déjà à destination`);
                resolve(true);
                return;
            }
            console.log(`🚶 DÉPLACEMENT: ${pnj.nom} commence son trajet depuis [${pnj.localisation.position.x}, ${pnj.localisation.position.y}] vers [${destination.x}, ${destination.y}]${batimentCible ? ` (${batimentCible})` : ''}`);
            // Trouver un chemin vers la destination
            this.pathfinding.trouverChemin(pnj.localisation.position, destination, (chemin) => {
                if (!chemin) {
                    console.error(`❌ PATHFINDING: Aucun chemin trouvé pour ${pnj.nom} vers la destination [${destination.x}, ${destination.y}]`);
                    resolve(false);
                    return;
                }
                console.log(`🗺️ PATHFINDING: Chemin trouvé pour ${pnj.nom} - ${chemin.length} étapes`);
                // Enregistrer le déplacement
                this.deplacements.set(pnj.id, {
                    chemin,
                    etapeActuelle: 0,
                    destination,
                    batimentCible
                });
                // Mettre à jour l'état du PNJ
                pnj.etatActuel.destination = destination;
                pnj.etatActuel.batimentCible = batimentCible;
                // Ajouter une entrée dans l'historique
                pnj.historique.push({
                    timestamp: Date.now(),
                    etat: {
                        activite: pnj.etatActuel.activite,
                        destination,
                        batimentCible
                    },
                    action: `${pnj.nom} commence à se déplacer vers ${batimentCible || 'une destination'}.`
                });
                console.log(`✅ DÉPLACEMENT: ${pnj.nom} a commencé son déplacement vers ${batimentCible || 'une destination'}`);
                resolve(true);
            });
        });
    }
    /**
     * Déplace un PNJ vers un bâtiment par son type
     */
    deplacerVersBatiment(pnj, typeBatiment) {
        // Trouver tous les bâtiments du type demandé
        const batiments = this.batimentService.getBatimentsParType(typeBatiment);
        if (batiments.length === 0) {
            console.error(`Aucun bâtiment de type ${typeBatiment} trouvé`);
            return Promise.resolve(false);
        }
        // Prendre le bâtiment le plus proche
        const batimentProche = batiments.reduce((plus_proche, batiment) => {
            const distance = this.calculerDistance(pnj.localisation.position, batiment.position);
            const distance_plus_proche = this.calculerDistance(pnj.localisation.position, plus_proche.position);
            return distance < distance_plus_proche ? batiment : plus_proche;
        });
        // Déplacer le PNJ vers ce bâtiment
        return this.deplacerVers(pnj, batimentProche.position, batimentProche.id);
    }
    /**
     * Met à jour la position de tous les PNJ en cours de déplacement
     */
    mettreAJourDeplacements(pnjs) {
        pnjs.forEach(pnj => {
            const deplacement = this.deplacements.get(pnj.id);
            if (!deplacement)
                return; // PNJ pas en déplacement
            // Si on est arrivé à la fin du chemin
            if (deplacement.etapeActuelle >= deplacement.chemin.length - 1) {
                // Arrivée à destination
                pnj.localisation.position = deplacement.destination;
                console.log(`🏁 ARRIVÉE: ${pnj.nom} est arrivé à destination [${deplacement.destination.x}, ${deplacement.destination.y}]${deplacement.batimentCible ? ` (${deplacement.batimentCible})` : ''}`);
                // Ajouter une entrée dans l'historique
                pnj.historique.push({
                    timestamp: Date.now(),
                    etat: {
                        activite: pnj.etatActuel.activite,
                        batimentCible: deplacement.batimentCible
                    },
                    action: `${pnj.nom} est arrivé à ${deplacement.batimentCible || 'destination'}.`
                });
                // Nettoyer l'état de déplacement
                pnj.etatActuel.destination = undefined;
                this.deplacements.delete(pnj.id);
                // Émettre un événement d'arrivée
                this.emit('arrivee', pnj, deplacement.batimentCible);
                return;
            }
            // Sinon, avancer vers la prochaine étape
            const prochaineEtape = Math.min(deplacement.etapeActuelle + this.vitesseDeplacement, deplacement.chemin.length - 1);
            // Ancienne position
            const anciennePosition = Object.assign({}, pnj.localisation.position);
            // Mettre à jour la position du PNJ
            pnj.localisation.position = deplacement.chemin[prochaineEtape];
            deplacement.etapeActuelle = prochaineEtape;
            // Log détaillé tous les 5 pas
            if (prochaineEtape % 5 === 0 || prochaineEtape === deplacement.chemin.length - 2) {
                console.log(`🔄 PROGRESSION: ${pnj.nom} se déplace de [${anciennePosition.x.toFixed(1)}, ${anciennePosition.y.toFixed(1)}] vers [${pnj.localisation.position.x.toFixed(1)}, ${pnj.localisation.position.y.toFixed(1)}] - Étape ${prochaineEtape + 1}/${deplacement.chemin.length}`);
            }
        });
    }
    /**
     * Vérifie si un PNJ est en déplacement
     */
    estEnDeplacement(pnjId) {
        return this.deplacements.has(pnjId);
    }
    /**
     * Annule le déplacement d'un PNJ
     */
    annulerDeplacement(pnj) {
        if (this.deplacements.has(pnj.id)) {
            // Ajouter une entrée dans l'historique
            pnj.historique.push({
                timestamp: Date.now(),
                etat: pnj.etatActuel,
                action: `${pnj.nom} a interrompu son déplacement.`
            });
            // Nettoyer l'état de déplacement
            pnj.etatActuel.destination = undefined;
            pnj.etatActuel.batimentCible = undefined;
            this.deplacements.delete(pnj.id);
        }
    }
    /**
     * Vérifie si une position est proche d'une autre (arrivée à destination)
     */
    estADestination(position, destination, tolerance = 0.5) {
        return this.calculerDistance(position, destination) <= tolerance;
    }
    /**
     * Calcule la distance euclidienne entre deux positions
     */
    calculerDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
exports.DeplacementService = DeplacementService;
