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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathfindingService = void 0;
const EasyStar = __importStar(require("easystarjs"));
class PathfindingService {
    constructor() {
        this.grid = [];
        this.gridSize = { width: 50, height: 50 }; // Taille par défaut de la grille
        this.easystar = new EasyStar.js();
        this.initialiserGrille();
    }
    static getInstance() {
        if (!PathfindingService.instance) {
            PathfindingService.instance = new PathfindingService();
        }
        return PathfindingService.instance;
    }
    /**
     * Initialise la grille de pathfinding
     */
    initialiserGrille() {
        // Créer une grille vide (0 = accessible, 1 = obstacle)
        this.grid = Array(this.gridSize.height).fill(0).map(() => Array(this.gridSize.width).fill(0));
        // Configurer EasyStar avec cette grille
        this.easystar.setGrid(this.grid);
        this.easystar.setAcceptableTiles([0]); // 0 = case accessible
        this.easystar.enableDiagonals(); // Permet de se déplacer en diagonale
        this.easystar.enableCornerCutting(); // Permet de couper les coins
    }
    /**
     * Ajoute un obstacle à la grille
     */
    ajouterObstacle(x, y) {
        if (this.coordonneesValides(x, y)) {
            this.grid[y][x] = 1; // 1 = obstacle
            this.easystar.setGrid(this.grid); // Mettre à jour la grille
        }
    }
    /**
     * Retire un obstacle de la grille
     */
    retirerObstacle(x, y) {
        if (this.coordonneesValides(x, y)) {
            this.grid[y][x] = 0; // 0 = accessible
            this.easystar.setGrid(this.grid); // Mettre à jour la grille
        }
    }
    /**
     * Vérifie si les coordonnées sont valides
     */
    coordonneesValides(x, y) {
        return x >= 0 && x < this.gridSize.width && y >= 0 && y < this.gridSize.height;
    }
    /**
     * Trouve un chemin entre deux positions
     */
    trouverChemin(debut, fin, callback) {
        // Convertir les positions en coordonnées de grille
        const debutX = Math.floor(debut.x);
        const debutY = Math.floor(debut.y);
        const finX = Math.floor(fin.x);
        const finY = Math.floor(fin.y);
        console.log(`🧭 PATHFINDING: Recherche de chemin de [${debutX}, ${debutY}] vers [${finX}, ${finY}]`);
        // Vérifier que les coordonnées sont valides
        if (!this.coordonneesValides(debutX, debutY) || !this.coordonneesValides(finX, finY)) {
            console.error(`❌ PATHFINDING: Coordonnées invalides - Départ: [${debutX}, ${debutY}], Arrivée: [${finX}, ${finY}]`);
            callback(null);
            return;
        }
        // Si la destination est un obstacle, impossible d'y aller
        if (this.grid[finY][finX] === 1) {
            console.error(`❌ PATHFINDING: La destination [${finX}, ${finY}] est un obstacle`);
            callback(null);
            return;
        }
        // Calculer le chemin
        this.easystar.findPath(debutX, debutY, finX, finY, (path) => {
            if (path === null) {
                console.log(`❌ PATHFINDING: Aucun chemin trouvé entre [${debutX}, ${debutY}] et [${finX}, ${finY}]`);
                callback(null);
            }
            else {
                // Convertir le chemin en tableau de Position
                const chemin = path.map(point => ({ x: point.x, y: point.y }));
                console.log(`✅ PATHFINDING: Chemin trouvé avec ${chemin.length} étapes`);
                // Afficher les détails du chemin
                if (chemin.length > 0) {
                    console.log(`🗺️ PATHFINDING: Début du chemin: [${chemin[0].x}, ${chemin[0].y}]`);
                    if (chemin.length > 1) {
                        console.log(`🗺️ PATHFINDING: Fin du chemin: [${chemin[chemin.length - 1].x}, ${chemin[chemin.length - 1].y}]`);
                    }
                }
                callback(chemin);
            }
        });
        // Lancer le calcul (nécessaire pour EasyStar)
        this.easystar.calculate();
    }
    /**
     * Met à jour la carte avec les batiments et obstacles
     */
    mettreAJourCarte(batiments) {
        // Réinitialiser la grille
        this.initialiserGrille();
        console.log(`🗺️ PATHFINDING: Mise à jour de la carte avec ${batiments.length} bâtiments`);
        // Ajouter les batiments comme obstacles
        batiments.forEach(batiment => {
            const x = Math.floor(batiment.position.x);
            const y = Math.floor(batiment.position.y);
            // Si le batiment a des dimensions, bloquer toute sa surface
            if (batiment.dimensions) {
                const largeur = batiment.dimensions.largeur;
                const hauteur = batiment.dimensions.hauteur;
                console.log(`🏢 PATHFINDING: Ajout du bâtiment ${batiment.id} en [${x}, ${y}] avec dimensions ${largeur}x${hauteur}`);
                for (let i = 0; i < largeur; i++) {
                    for (let j = 0; j < hauteur; j++) {
                        if (this.coordonneesValides(x + i, y + j)) {
                            this.grid[y + j][x + i] = 1; // Bloquer la case
                        }
                    }
                }
            }
            else {
                // Sinon bloquer juste la case du batiment
                if (this.coordonneesValides(x, y)) {
                    console.log(`🏢 PATHFINDING: Ajout du bâtiment ${batiment.id} en [${x}, ${y}]`);
                    this.grid[y][x] = 1; // Bloquer la case
                }
            }
        });
        // Mettre à jour EasyStar avec la nouvelle grille
        this.easystar.setGrid(this.grid);
        console.log(`✅ PATHFINDING: Carte mise à jour avec succès`);
    }
}
exports.PathfindingService = PathfindingService;
