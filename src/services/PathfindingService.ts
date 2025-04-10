import * as EasyStar from 'easystarjs';
import { Position, Batiment, ElementDecor } from '../types';
import { getElementsDecor } from '../environnement';

export class PathfindingService {
  private static instance: PathfindingService;
  private easystar: EasyStar.js;
  private grille: number[][] = [];
  private tailleGrille: number = 100; // 100x100 par défaut
  private echelle: number = 1; // Échelle pour la discrétisation
  private offset: Position = { x: 50, y: 50 }; // Offset pour gérer les positions négatives

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
   * Initialise une grille vide pour le pathfinding
   */
  private initialiserGrille(): void {
    // Initialiser une grille vide (0 = accessible, 1 = obstacle)
    this.grille = Array(this.tailleGrille).fill(0).map(() => Array(this.tailleGrille).fill(0));
    
    // Configurer EasyStar avec cette grille
    this.easystar.setGrid(this.grille);
    this.easystar.setAcceptableTiles([0]); // 0 = case accessible
    this.easystar.enableDiagonals(); // Permet de se déplacer en diagonale
    this.easystar.enableSync(); // Mode synchrone pour des performances
  }

  /**
   * Met à jour la carte avec les bâtiments et les éléments de décor
   */
  public mettreAJourCarte(batiments: Batiment[]): void {
    // Réinitialiser la grille
    this.initialiserGrille();
    
    // Marquer les positions des bâtiments comme inaccessibles
    batiments.forEach(batiment => {
      this.marquerBatiment(batiment);
    });
    
    // Marquer les éléments de décor bloquants
    const elementsDecor = getElementsDecor();
    elementsDecor.forEach(element => {
      if (element.bloquant) {
        this.marquerElementDecor(element);
      }
    });
    
    // Mettre à jour EasyStar avec la nouvelle grille
    this.easystar.setGrid(this.grille);
    
    console.log('Carte de pathfinding mise à jour avec', batiments.length, 'bâtiments et', 
      elementsDecor.filter(e => e.bloquant).length, 'éléments de décor bloquants');
  }

  /**
   * Marquer un bâtiment sur la grille comme inaccessible
   */
  private marquerBatiment(batiment: Batiment): void {
    // Extraire les dimensions du bâtiment
    const dimensions = batiment.dimensions || { largeur: 5, hauteur: 5 };
    
    // Calculer les limites du bâtiment sur la grille
    const posGrille = this.positionVersGrille(batiment.position);
    const largeur = Math.ceil(dimensions.largeur / this.echelle);
    const hauteur = Math.ceil(dimensions.hauteur / this.echelle);
    
    // Marquer les cellules du bâtiment comme inaccessibles
    for (let i = 0; i < largeur; i++) {
      for (let j = 0; j < hauteur; j++) {
        const x = posGrille.x + i - Math.floor(largeur / 2);
        const y = posGrille.y + j - Math.floor(hauteur / 2);
        
        if (this.estDansGrille(x, y)) {
          this.grille[y][x] = 1; // 1 = obstacle
        }
      }
    }
  }

  /**
   * Marquer un élément de décor bloquant sur la grille
   */
  private marquerElementDecor(element: ElementDecor): void {
    // La taille de l'élément détermine sa zone d'influence
    const taille = Math.ceil(element.taille);
    
    // Calculer la position sur la grille
    const posGrille = this.positionVersGrille(element.position);
    
    // Marquer les cellules occupées par l'élément comme inaccessibles
    for (let i = -taille; i <= taille; i++) {
      for (let j = -taille; j <= taille; j++) {
        // Calculer la distance au centre de l'élément
        const distance = Math.sqrt(i*i + j*j);
        
        // Si la distance est inférieure à la taille, c'est dans l'élément
        if (distance <= taille) {
          const x = posGrille.x + i;
          const y = posGrille.y + j;
          
          if (this.estDansGrille(x, y)) {
            this.grille[y][x] = 1; // 1 = obstacle
          }
        }
      }
    }
  }

  /**
   * Vérifier si les coordonnées sont dans la grille
   */
  private estDansGrille(x: number, y: number): boolean {
    return x >= 0 && x < this.tailleGrille && y >= 0 && y < this.tailleGrille;
  }

  /**
   * Convertir une position du monde en coordonnées de grille
   */
  private positionVersGrille(position: Position): { x: number; y: number } {
    return {
      x: Math.floor((position.x + this.offset.x) / this.echelle),
      y: Math.floor((position.y + this.offset.y) / this.echelle)
    };
  }

  /**
   * Convertir des coordonnées de grille en position du monde
   */
  private grilleVersPosition(x: number, y: number): Position {
    return {
      x: (x * this.echelle) - this.offset.x,
      y: (y * this.echelle) - this.offset.y
    };
  }

  /**
   * Calcule un chemin entre deux positions
   */
  public trouverChemin(
    debut: Position,
    fin: Position,
    callback: (chemin: Position[] | null) => void
  ): void {
    // Convertir les positions en coordonnées de grille
    const debutGrille = this.positionVersGrille(debut);
    const finGrille = this.positionVersGrille(fin);

    console.log(`🧭 PATHFINDING: Recherche de chemin de [${debutGrille.x}, ${debutGrille.y}] vers [${finGrille.x}, ${finGrille.y}]`);

    // Vérifier que les coordonnées sont valides
    if (!this.estDansGrille(debutGrille.x, debutGrille.y) || !this.estDansGrille(finGrille.x, finGrille.y)) {
      console.error(`❌ PATHFINDING: Coordonnées invalides - Départ: [${debutGrille.x}, ${debutGrille.y}], Arrivée: [${finGrille.x}, ${finGrille.y}]`);
      callback(null);
      return;
    }

    // Vérifier si la destination est accessible
    if (this.grille[finGrille.y][finGrille.x] === 1) {
      console.error(`❌ PATHFINDING: La destination [${finGrille.x}, ${finGrille.y}] est inaccessible`);
      callback(null);
      return;
    }

    // Calculer le chemin
    this.easystar.findPath(debutGrille.x, debutGrille.y, finGrille.x, finGrille.y, (path) => {
      if (path === null) {
        console.log(`❌ PATHFINDING: Aucun chemin trouvé entre [${debutGrille.x}, ${debutGrille.y}] et [${finGrille.x}, ${finGrille.y}]`);
        callback(null);
      } else {
        // Convertir le chemin en tableau de Position
        const chemin: Position[] = path.map(point => this.grilleVersPosition(point.x, point.y));
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
   * Vérifie si une case est accessible (valide et pas un obstacle)
   */
  public estAccessible(x: number, y: number): boolean {
    // Convertir les coordonnées du monde en coordonnées de grille
    const posGrille = this.positionVersGrille({ x, y });
    
    // Vérifier si les coordonnées sont dans la grille et la valeur est 0 (accessible)
    return this.estDansGrille(posGrille.x, posGrille.y) && this.grille[posGrille.y][posGrille.x] === 0;
  }
} 