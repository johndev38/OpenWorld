"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batimentService = exports.BatimentService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class BatimentService {
    constructor() {
        this.dataDir = 'data/batiments';
        this.batiments = new Map();
        this.chargerBatiments();
    }
    static getInstance() {
        if (!BatimentService.instance) {
            BatimentService.instance = new BatimentService();
        }
        return BatimentService.instance;
    }
    chargerBatiments() {
        if (!fs_1.default.existsSync(this.dataDir)) {
            fs_1.default.mkdirSync(this.dataDir, { recursive: true });
            return;
        }
        const files = fs_1.default.readdirSync(this.dataDir);
        files.forEach(file => {
            if (file.endsWith('.json')) {
                const filePath = path_1.default.join(this.dataDir, file);
                const data = fs_1.default.readFileSync(filePath, 'utf-8');
                const batiment = JSON.parse(data);
                this.batiments.set(batiment.id, batiment);
            }
        });
    }
    getBatiment(id) {
        return this.batiments.get(id);
    }
    getAllBatiments() {
        return Array.from(this.batiments.values());
    }
    getBatimentsParType(type) {
        return Array.from(this.batiments.values()).filter(b => b.type === type);
    }
    ajouterBatiment(batiment) {
        this.batiments.set(batiment.id, batiment);
        this.sauvegarderBatiment(batiment);
    }
    mettreAJourBatiment(batiment) {
        if (!this.batiments.has(batiment.id)) {
            throw new Error(`Bâtiment avec l'ID ${batiment.id} non trouvé`);
        }
        this.batiments.set(batiment.id, batiment);
        this.sauvegarderBatiment(batiment);
    }
    sauvegarderBatiment(batiment) {
        const filePath = path_1.default.join(this.dataDir, `${batiment.id}.json`);
        fs_1.default.writeFileSync(filePath, JSON.stringify(batiment, null, 2), 'utf-8');
    }
    supprimerBatiment(id) {
        if (!this.batiments.has(id)) {
            throw new Error(`Bâtiment avec l'ID ${id} non trouvé`);
        }
        this.batiments.delete(id);
        const filePath = path_1.default.join(this.dataDir, `${id}.json`);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    ajouterOccupant(batimentId, pnjId) {
        const batiment = this.getBatiment(batimentId);
        if (!batiment) {
            throw new Error(`Bâtiment avec l'ID ${batimentId} non trouvé`);
        }
        if (!batiment.occupants.includes(pnjId)) {
            batiment.occupants.push(pnjId);
            this.mettreAJourBatiment(batiment);
        }
    }
    retirerOccupant(batimentId, pnjId) {
        const batiment = this.getBatiment(batimentId);
        if (!batiment) {
            throw new Error(`Bâtiment avec l'ID ${batimentId} non trouvé`);
        }
        batiment.occupants = batiment.occupants.filter(id => id !== pnjId);
        this.mettreAJourBatiment(batiment);
    }
}
exports.BatimentService = BatimentService;
exports.batimentService = BatimentService.getInstance();
