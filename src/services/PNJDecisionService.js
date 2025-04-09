"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PNJDecisionService = void 0;
const DeplacementService_1 = require("./DeplacementService");
const BatimentService_1 = require("./BatimentService");
const events_1 = __importDefault(require("events"));
/**
 * Service qui gère les décisions des PNJ en fonction de leurs besoins
 */
class PNJDecisionService extends events_1.default {
    constructor() {
        super();
        // Seuils pour les différents besoins (en dessous, le besoin devient prioritaire)
        this.seuils = {
            faim: 30,
            soif: 25,
            fatigue: 20,
            social: 15,
            divertissement: 10,
            sante: 40
        };
        this.deplacementService = DeplacementService_1.DeplacementService.getInstance();
        this.batimentService = BatimentService_1.BatimentService.getInstance();
    }
    static getInstance() {
        if (!PNJDecisionService.instance) {
            PNJDecisionService.instance = new PNJDecisionService();
        }
        return PNJDecisionService.instance;
    }
    /**
     * Évalue les besoins d'un PNJ et prend une décision sur sa prochaine action
     */
    evaluerBesoinsEtDecider(pnj) {
        // Si le PNJ est déjà en déplacement, ne pas interférer
        if (this.deplacementService.estEnDeplacement(pnj.id)) {
            return Promise.resolve(false);
        }
        console.log(`🤔 DÉCISION: Évaluation des besoins de ${pnj.nom} - Faim: ${pnj.besoins.faim}, Soif: ${pnj.besoins.soif}, Fatigue: ${pnj.besoins.fatigue}, Social: ${pnj.besoins.social}, Santé: ${pnj.sante}`);
        // Récupérer le besoin le plus urgent
        const besoinUrgent = this.trouverBesoinPrioritaire(pnj);
        if (!besoinUrgent) {
            console.log(`😌 DÉCISION: ${pnj.nom} n'a pas de besoin urgent, il continue son activité actuelle (${pnj.etatActuel.activite})`);
            return Promise.resolve(false);
        }
        console.log(`⚠️ DÉCISION: ${pnj.nom} a un besoin urgent: ${besoinUrgent.type} (${besoinUrgent.valeur})`);
        // Trouver un bâtiment qui répond à ce besoin
        const batiment = this.trouverBatimentPourBesoin(besoinUrgent.type, pnj);
        if (!batiment) {
            console.log(`❌ DÉCISION: Aucun bâtiment disponible pour répondre au besoin ${besoinUrgent.type} de ${pnj.nom}`);
            return Promise.resolve(false);
        }
        console.log(`🏢 DÉCISION: ${pnj.nom} a choisi le bâtiment ${batiment.nom} (${batiment.id}) en [${batiment.position.x}, ${batiment.position.y}] pour son besoin de ${besoinUrgent.type}`);
        // Mettre à jour l'état du PNJ en fonction du besoin
        this.mettreAJourEtatPNJ(pnj, besoinUrgent.type);
        // Déplacer le PNJ vers le bâtiment
        console.log(`✅ DÉCISION: ${pnj.nom} se dirige vers ${batiment.nom} pour satisfaire son besoin de ${besoinUrgent.type}`);
        return this.deplacementService.deplacerVers(pnj, batiment.position, batiment.id);
    }
    /**
     * Trouve le besoin le plus urgent d'un PNJ
     */
    trouverBesoinPrioritaire(pnj) {
        const besoins = [
            { type: 'faim', valeur: pnj.besoins.faim, seuil: this.seuils.faim },
            { type: 'soif', valeur: pnj.besoins.soif, seuil: this.seuils.soif },
            { type: 'fatigue', valeur: pnj.besoins.fatigue, seuil: this.seuils.fatigue },
            { type: 'social', valeur: pnj.besoins.social, seuil: this.seuils.social },
            { type: 'divertissement', valeur: pnj.besoins.divertissement, seuil: this.seuils.divertissement },
            { type: 'sante', valeur: pnj.sante, seuil: this.seuils.sante }
        ];
        // Filtrer les besoins qui sont en dessous du seuil
        const besoinsUrgents = besoins.filter(b => b.valeur < b.seuil);
        if (besoinsUrgents.length === 0) {
            return null;
        }
        // Trier par ordre croissant de valeur (le plus bas = le plus urgent)
        besoinsUrgents.sort((a, b) => a.valeur - b.valeur);
        return { type: besoinsUrgents[0].type, valeur: besoinsUrgents[0].valeur };
    }
    /**
     * Trouve un bâtiment approprié pour répondre à un besoin
     */
    trouverBatimentPourBesoin(typeBesoin, pnj) {
        let service;
        let typeBatiment;
        // Associer le besoin à un service ou type de bâtiment
        switch (typeBesoin) {
            case 'faim':
                service = 'repas';
                break;
            case 'soif':
                service = 'boissons';
                break;
            case 'fatigue':
                service = 'repos';
                break;
            case 'social':
                service = 'boissons'; // Les tavernes sont bonnes pour socialiser
                break;
            case 'divertissement':
                // Selon la personnalité du PNJ, différents types de divertissement
                if (pnj.personnalite === 'sage' || pnj.personnalite === 'mystérieux') {
                    typeBatiment = 'bibliotheque';
                }
                else {
                    typeBatiment = 'taverne';
                }
                break;
            case 'sante':
                service = 'soins';
                break;
            default:
                return null;
        }
        let batiments = [];
        if (service) {
            // Trouver tous les bâtiments offrant ce service
            batiments = this.batimentService.getAllBatiments().filter(b => b.services.includes(service));
        }
        else if (typeBatiment) {
            // Ou trouver tous les bâtiments de ce type
            batiments = this.batimentService.getBatimentsParType(typeBatiment);
        }
        if (batiments.length === 0) {
            return null;
        }
        // Trouver le bâtiment le plus proche parmi ceux disponibles
        return this.trouverBatimentLePlusProche(batiments, pnj);
    }
    /**
     * Trouve le bâtiment le plus proche parmi une liste de bâtiments
     */
    trouverBatimentLePlusProche(batiments, pnj) {
        if (batiments.length === 0) {
            return null;
        }
        // Trier les bâtiments par distance
        batiments.sort((a, b) => {
            const distanceA = this.calculerDistance(pnj.localisation.position, a.position);
            const distanceB = this.calculerDistance(pnj.localisation.position, b.position);
            return distanceA - distanceB;
        });
        return batiments[0];
    }
    /**
     * Calcule la distance euclidienne entre deux positions
     */
    calculerDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Met à jour l'état du PNJ en fonction du besoin à satisfaire
     */
    mettreAJourEtatPNJ(pnj, typeBesoin) {
        switch (typeBesoin) {
            case 'faim':
            case 'soif':
                pnj.etatActuel.activite = 'repas';
                break;
            case 'fatigue':
                pnj.etatActuel.activite = 'repos';
                break;
            case 'social':
                pnj.etatActuel.activite = 'social';
                break;
            case 'divertissement':
                pnj.etatActuel.activite = 'loisir';
                break;
            case 'sante':
                // On pourrait créer une nouvelle activité "soin" si nécessaire
                pnj.etatActuel.activite = 'repos';
                break;
        }
        // Ajouter une entrée dans l'historique
        pnj.historique.push({
            timestamp: Date.now(),
            etat: pnj.etatActuel,
            action: `${pnj.nom} a décidé de satisfaire son besoin de ${typeBesoin}.`
        });
    }
    /**
     * Simuler l'effet de l'action sur les besoins du PNJ (à appeler après l'arrivée)
     */
    satisfaireBesoin(pnj, batimentId) {
        const batiment = this.batimentService.getBatiment(batimentId);
        if (!batiment) {
            console.log(`❌ SATISFACTION: Impossible de satisfaire les besoins de ${pnj.nom}, bâtiment ${batimentId} non trouvé`);
            return;
        }
        console.log(`🏢 SATISFACTION: ${pnj.nom} satisfait ses besoins à ${batiment.nom} (${batiment.type}) - Services: [${batiment.services.join(', ')}]`);
        console.log(`📊 SATISFACTION: Besoins avant - Faim: ${pnj.besoins.faim}, Soif: ${pnj.besoins.soif}, Fatigue: ${pnj.besoins.fatigue}, Social: ${pnj.besoins.social}, Santé: ${pnj.sante}`);
        // Mettre à jour les besoins en fonction des services du bâtiment
        if (batiment.services.includes('repas')) {
            pnj.besoins.faim = Math.min(100, pnj.besoins.faim + 50);
            console.log(`🍽️ SATISFACTION: ${pnj.nom} s'est restauré à ${batiment.nom}. Faim: ${pnj.besoins.faim}`);
        }
        if (batiment.services.includes('boissons')) {
            pnj.besoins.soif = Math.min(100, pnj.besoins.soif + 60);
            console.log(`🥤 SATISFACTION: ${pnj.nom} a étanché sa soif à ${batiment.nom}. Soif: ${pnj.besoins.soif}`);
        }
        if (batiment.services.includes('repos')) {
            pnj.besoins.fatigue = Math.min(100, pnj.besoins.fatigue + 40);
            pnj.energie = Math.min(100, pnj.energie + 30);
            console.log(`😴 SATISFACTION: ${pnj.nom} s'est reposé à ${batiment.nom}. Fatigue: ${pnj.besoins.fatigue}, Énergie: ${pnj.energie}`);
        }
        if (batiment.type === 'taverne' || batiment.type === 'marche') {
            pnj.besoins.social = Math.min(100, pnj.besoins.social + 45);
            pnj.besoins.divertissement = Math.min(100, pnj.besoins.divertissement + 25);
            console.log(`👥 SATISFACTION: ${pnj.nom} a socialisé à ${batiment.nom}. Social: ${pnj.besoins.social}, Divertissement: ${pnj.besoins.divertissement}`);
        }
        if (batiment.services.includes('soins')) {
            pnj.sante = Math.min(100, pnj.sante + 70);
            console.log(`🏥 SATISFACTION: ${pnj.nom} a reçu des soins à ${batiment.nom}. Santé: ${pnj.sante}`);
        }
        console.log(`📈 SATISFACTION: Besoins après - Faim: ${pnj.besoins.faim}, Soif: ${pnj.besoins.soif}, Fatigue: ${pnj.besoins.fatigue}, Social: ${pnj.besoins.social}, Santé: ${pnj.sante}`);
        // Ajouter une entrée dans l'historique
        pnj.historique.push({
            timestamp: Date.now(),
            etat: pnj.etatActuel,
            action: `${pnj.nom} a satisfait ses besoins à ${batiment.nom}.`
        });
    }
}
exports.PNJDecisionService = PNJDecisionService;
