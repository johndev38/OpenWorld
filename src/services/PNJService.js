"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pnjService = exports.PNJService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BatimentService_1 = require("./BatimentService");
const MaisonService_1 = require("./MaisonService");
const events_1 = __importDefault(require("events"));
class PNJService extends events_1.default {
    constructor() {
        super();
        this.dataDir = 'data/pnjs';
        this.pnjs = new Map();
        this.chargerPNJs();
    }
    static getInstance() {
        if (!PNJService.instance) {
            PNJService.instance = new PNJService();
        }
        return PNJService.instance;
    }
    chargerPNJs() {
        if (!fs_1.default.existsSync(this.dataDir)) {
            fs_1.default.mkdirSync(this.dataDir, { recursive: true });
            return;
        }
        const files = fs_1.default.readdirSync(this.dataDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path_1.default.join(this.dataDir, file);
                const data = fs_1.default.readFileSync(filePath, 'utf-8');
                const pnj = JSON.parse(data);
                this.pnjs.set(pnj.id, pnj);
            }
        });
    }
    getPNJ(id) {
        return this.pnjs.get(id);
    }
    getAllPNJs() {
        return Array.from(this.pnjs.values());
    }
    ajouterPNJ(pnj) {
        var _a;
        // Créer une maison pour le PNJ s'il n'en a pas déjà une
        if (!((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId)) {
            try {
                const maison = MaisonService_1.maisonService.creerMaison(pnj);
                pnj.localisation = {
                    batimentId: maison.id,
                    position: maison.position,
                    exterieur: false
                };
            }
            catch (error) {
                console.warn(`Impossible de créer une maison pour ${pnj.nom}:`, error);
                // Si on ne peut pas créer de maison, on place le PNJ à l'extérieur
                if (!pnj.localisation) {
                    pnj.localisation = {
                        position: { x: 0, y: 0 },
                        exterieur: true
                    };
                }
            }
        }
        this.pnjs.set(pnj.id, pnj);
        this.sauvegarderPNJ(pnj);
        this.emit('pnj:ajoute', pnj);
    }
    mettreAJourPNJ(pnj) {
        const ancienPNJ = this.pnjs.get(pnj.id);
        if (!ancienPNJ) {
            throw new Error(`PNJ avec l'ID ${pnj.id} non trouvé`);
        }
        // Vérifier si la position a changé
        if (this.positionAChange(ancienPNJ.localisation, pnj.localisation)) {
            this.gererChangementPosition(ancienPNJ, pnj);
        }
        this.pnjs.set(pnj.id, pnj);
        this.sauvegarderPNJ(pnj);
        this.emit('pnj:modifie', pnj);
    }
    positionAChange(ancienne, nouvelle) {
        if (!ancienne || !nouvelle)
            return true;
        return ancienne.batimentId !== nouvelle.batimentId ||
            ancienne.exterieur !== nouvelle.exterieur ||
            ancienne.position.x !== nouvelle.position.x ||
            ancienne.position.y !== nouvelle.position.y;
    }
    gererChangementPosition(ancienPNJ, nouveauPNJ) {
        var _a, _b;
        // Gérer le départ d'un bâtiment
        if ((_a = ancienPNJ.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) {
            BatimentService_1.batimentService.retirerOccupant(ancienPNJ.localisation.batimentId, ancienPNJ.id);
        }
        // Gérer l'entrée dans un nouveau bâtiment
        if ((_b = nouveauPNJ.localisation) === null || _b === void 0 ? void 0 : _b.batimentId) {
            BatimentService_1.batimentService.ajouterOccupant(nouveauPNJ.localisation.batimentId, nouveauPNJ.id);
        }
        // Émettre un événement de changement de position
        this.emit('pnj:position', {
            pnjId: nouveauPNJ.id,
            anciennePosition: ancienPNJ.localisation,
            nouvellePosition: nouveauPNJ.localisation
        });
    }
    sauvegarderPNJ(pnj) {
        const filePath = path_1.default.join(this.dataDir, `${pnj.id}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(pnj, null, 2), 'utf-8');
    }
    supprimerPNJ(id) {
        var _a;
        const pnj = this.pnjs.get(id);
        if (!pnj) {
            throw new Error(`PNJ avec l'ID ${id} non trouvé`);
        }
        // Retirer le PNJ de sa maison et des autres bâtiments
        MaisonService_1.maisonService.retirerPNJMaison(id);
        if ((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) {
            BatimentService_1.batimentService.retirerOccupant(pnj.localisation.batimentId, id);
        }
        this.pnjs.delete(id);
        const filePath = path_1.default.join(this.dataDir, `${id}.json`);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        this.emit('pnj:supprime', id);
    }
    deplacerPNJ(pnjId, nouvellePosition, batimentId) {
        const pnj = this.getPNJ(pnjId);
        if (!pnj) {
            throw new Error(`PNJ avec l'ID ${pnjId} non trouvé`);
        }
        const nouvelleLocalisation = {
            position: nouvellePosition,
            batimentId,
            exterieur: !batimentId
        };
        const pnjMisAJour = Object.assign(Object.assign({}, pnj), { localisation: nouvelleLocalisation });
        this.mettreAJourPNJ(pnjMisAJour);
    }
}
exports.PNJService = PNJService;
exports.pnjService = PNJService.getInstance();
