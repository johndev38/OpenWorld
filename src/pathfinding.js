"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.pathfinder = exports.PathfinderService = void 0;
const EasyStar = __importStar(require("easystarjs"));
// Taille de la grille de la ville (à ajuster selon vos besoins)
const GRID_WIDTH = 50;
const GRID_HEIGHT = 50;
// Singleton pour le pathfinder
class PathfinderService {
    constructor() {
        this.easystar = new EasyStar.js();
        this.grid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
        this.easystar.setGrid(this.grid);
        this.easystar.setAcceptableTiles([0]); // 0 représente les cases traversables
        this.easystar.enableDiagonals();
        this.easystar.enableCornerCutting();
    }
    static getInstance() {
        if (!PathfinderService.instance) {
            PathfinderService.instance = new PathfinderService();
        }
        return PathfinderService.instance;
    }
    mettreAJourGrille(obstacles, batiments) {
        // Réinitialiser la grille
        this.grid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
        // Ajouter les obstacles (1 représente une case non traversable)
        obstacles.forEach(obstacle => {
            if (this.estDansLaGrille(obstacle)) {
                this.grid[obstacle.y][obstacle.x] = 1;
            }
        });
        // Ajouter les bâtiments comme obstacles
        batiments.forEach(batiment => {
            if (this.estDansLaGrille(batiment.position)) {
                this.grid[batiment.position.y][batiment.position.x] = 1;
            }
        });
        // Mettre à jour la grille dans EasyStar
        this.easystar.setGrid(this.grid);
    }
    estDansLaGrille(position) {
        return position.x >= 0 && position.x < GRID_WIDTH &&
            position.y >= 0 && position.y < GRID_HEIGHT;
    }
    trouverChemin(debut, fin) {
        return new Promise((resolve, reject) => {
            if (!this.estDansLaGrille(debut) || !this.estDansLaGrille(fin)) {
                reject(new Error("Position de début ou de fin hors de la grille"));
                return;
            }
            this.easystar.findPath(debut.x, debut.y, fin.x, fin.y, (path) => {
                if (path === null) {
                    reject(new Error("Aucun chemin trouvé"));
                }
                else {
                    resolve(path.map(p => ({ x: p.x, y: p.y })));
                }
            });
            this.easystar.calculate();
        });
    }
    trouverCheminVersBatimentProche(pnj, batiments, typeBatiment) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const batimentsType = batiments.filter(b => b.type === typeBatiment);
            if (batimentsType.length === 0) {
                throw new Error(`Aucun bâtiment de type ${typeBatiment} trouvé`);
            }
            if (!((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.position)) {
                throw new Error("Le PNJ n'a pas de position définie");
            }
            let meilleurChemin = null;
            let distanceMin = Infinity;
            for (const batiment of batimentsType) {
                try {
                    const chemin = yield this.trouverChemin(pnj.localisation.position, batiment.position);
                    if (chemin.length < distanceMin) {
                        distanceMin = chemin.length;
                        meilleurChemin = chemin;
                    }
                }
                catch (error) {
                    console.warn(`Impossible de trouver un chemin vers le bâtiment ${batiment.id}:`, error);
                }
            }
            if (!meilleurChemin) {
                throw new Error(`Aucun chemin trouvé vers un bâtiment de type ${typeBatiment}`);
            }
            return meilleurChemin;
        });
    }
    deplacerPNJVersDestination(pnj_1, destination_1) {
        return __awaiter(this, arguments, void 0, function* (pnj, destination, vitesse = 1) {
            var _a;
            if (!((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.position)) {
                throw new Error("Le PNJ n'a pas de position définie");
            }
            try {
                const chemin = yield this.trouverChemin(pnj.localisation.position, destination);
                // Logique de déplacement à implémenter selon les besoins
                // Par exemple, déplacer le PNJ d'un certain nombre de cases selon sa vitesse
                console.log(`PNJ ${pnj.id} se déplace vers la destination`, chemin);
            }
            catch (error) {
                console.error(`Erreur lors du déplacement du PNJ ${pnj.id}:`, error);
                throw error;
            }
        });
    }
}
exports.PathfinderService = PathfinderService;
// Exporter l'instance unique
exports.pathfinder = PathfinderService.getInstance();
