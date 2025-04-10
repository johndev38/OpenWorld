import * as EasyStar from 'easystarjs';
import { Position } from '../types';

export class PathfindingService {
  private static instance: PathfindingService;
  private easystar: EasyStar.js;
  private grid: number[][] = [];
  private gridSize = { width: 100, height: 100 }; // Taille par défaut de la grille

  private constructor() {
    this.easystar = new EasyStar.js();
    this.initialiserGrille();
  }

  public static getInstance(): PathfindingService {
    if (!PathfindingService.instance) {
      PathfindingService.instance = new PathfindingService();
    }
    return PathfindingService.instance;
  }

  /**
   * Initialise la grille de pathfinding
   */
  private initialiserGrille(): void {
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
  public ajouterObstacle(x: number, y: number): void {
    if (this.coordonneesValides(x, y)) {
      this.grid[y][x] = 1; // 1 = obstacle
      this.easystar.setGrid(this.grid); // Mettre à jour la grille
    }
  }

  /**
   * Retire un obstacle de la grille
   */
  public retirerObstacle(x: number, y: number): void {
    if (this.coordonneesValides(x, y)) {
      this.grid[y][x] = 0; // 0 = accessible
      this.easystar.setGrid(this.grid); // Mettre à jour la grille
    }
  }

  /**
   * Vérifie si les coordonnées sont valides
   */
  private coordonneesValides(x: number, y: number): boolean {
    return x >= 0 && x < this.gridSize.width && y >= 0 && y < this.gridSize.height;
  }

  /**
   * Vérifie si une case est accessible (valide et pas un obstacle)
   */
  public estAccessible(x: number, y: number): boolean {
    return this.coordonneesValides(x, y) && this.grid[y][x] === 0;
  }

  /**
   * Trouve un chemin entre deux positions
   */
  public trouverChemin(
    debut: Position, 
    fin: Position, 
    callback: (chemin: Position[] | null) => void
  ): void {
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
      } else {
        // Convertir le chemin en tableau de Position
        const chemin: Position[] = path.map(point => ({ x: point.x, y: point.y }));
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
  public mettreAJourCarte(batiments: any[]): void {
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
      } else {
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