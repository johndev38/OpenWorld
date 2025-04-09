"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maisonService = exports.MaisonService = void 0;
const BatimentService_1 = require("./BatimentService");
class MaisonService {
    constructor() {
        this.zonesHabitation = [
            { x: 5, y: 5 },
            { x: 5, y: 10 },
            { x: 5, y: 15 },
            { x: 10, y: 5 },
            { x: 10, y: 10 },
            { x: 10, y: 15 },
            { x: 15, y: 5 },
            { x: 15, y: 10 },
            { x: 15, y: 15 }
        ];
        this.positionsUtilisees = new Set();
        // Charger les positions déjà utilisées depuis les maisons existantes
        const batiments = BatimentService_1.batimentService.getAllBatiments();
        batiments
            .filter(b => b.type === 'maison')
            .forEach(b => this.positionsUtilisees.add(`${b.position.x},${b.position.y}`));
    }
    static getInstance() {
        if (!MaisonService.instance) {
            MaisonService.instance = new MaisonService();
        }
        return MaisonService.instance;
    }
    trouverPositionDisponible() {
        for (const position of this.zonesHabitation) {
            const positionKey = `${position.x},${position.y}`;
            if (!this.positionsUtilisees.has(positionKey)) {
                this.positionsUtilisees.add(positionKey);
                return position;
            }
        }
        return null;
    }
    creerMaison(pnj) {
        const position = this.trouverPositionDisponible();
        if (!position) {
            throw new Error("Plus de place disponible pour construire une nouvelle maison");
        }
        const maison = {
            id: `maison_${pnj.id}`,
            nom: `Maison de ${pnj.nom}`,
            type: 'maison',
            position,
            occupants: [pnj.id],
            dimensions: { largeur: 2, hauteur: 2 },
            capacite: 4,
            heureOuverture: 0,
            heureFermeture: 24, // Les maisons sont accessibles 24/24
            services: ['repos']
        };
        BatimentService_1.batimentService.ajouterBatiment(maison);
        return maison;
    }
    attribuerMaisonExistante(pnj, maisonId) {
        const maison = BatimentService_1.batimentService.getBatiment(maisonId);
        if (!maison) {
            throw new Error(`Maison avec l'ID ${maisonId} non trouvée`);
        }
        if (maison.type !== 'maison') {
            throw new Error(`Le bâtiment ${maisonId} n'est pas une maison`);
        }
        if (maison.occupants.length >= maison.capacite) {
            throw new Error(`La maison ${maisonId} est déjà pleine`);
        }
        // Ajouter le PNJ comme occupant
        BatimentService_1.batimentService.ajouterOccupant(maisonId, pnj.id);
    }
    trouverMaisonPNJ(pnjId) {
        return BatimentService_1.batimentService
            .getAllBatiments()
            .find(b => b.type === 'maison' && b.occupants.includes(pnjId));
    }
    retirerPNJMaison(pnjId) {
        const maison = this.trouverMaisonPNJ(pnjId);
        if (maison) {
            BatimentService_1.batimentService.retirerOccupant(maison.id, pnjId);
        }
    }
}
exports.MaisonService = MaisonService;
exports.maisonService = MaisonService.getInstance();
