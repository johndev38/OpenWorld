import * as EasyStar from 'easystarjs';
import { Position, PNJ, Batiment } from './types';

// Taille de la grille de la ville (à ajuster selon vos besoins)
const GRID_WIDTH = 50;
const GRID_HEIGHT = 50;

// Singleton pour le pathfinder
export class PathfinderService {
  private static instance: PathfinderService;
  private easystar: EasyStar.js;
  private grid: number[][];

  private constructor() {
    this.easystar = new EasyStar.js();
    this.grid = Array(GRID_HEIGHT).fill(0).map(() => Array(GRID_WIDTH).fill(0));
    this.easystar.setGrid(this.grid);
    this.easystar.setAcceptableTiles([0]); // 0 représente les cases traversables
    this.easystar.enableDiagonals();
    this.easystar.enableCornerCutting();
  }

  public static getInstance(): PathfinderService {
    if (!PathfinderService.instance) {
      PathfinderService.instance = new PathfinderService();
    }
    return PathfinderService.instance;
  }

  public mettreAJourGrille(obstacles: Position[], batiments: Batiment[]): void {
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

  private estDansLaGrille(position: Position): boolean {
    return position.x >= 0 && position.x < GRID_WIDTH && 
           position.y >= 0 && position.y < GRID_HEIGHT;
  }

  public trouverChemin(debut: Position, fin: Position): Promise<Position[]> {
    return new Promise((resolve, reject) => {
      if (!this.estDansLaGrille(debut) || !this.estDansLaGrille(fin)) {
        reject(new Error("Position de début ou de fin hors de la grille"));
        return;
      }

      this.easystar.findPath(debut.x, debut.y, fin.x, fin.y, (path) => {
        if (path === null) {
          reject(new Error("Aucun chemin trouvé"));
        } else {
          resolve(path.map(p => ({ x: p.x, y: p.y })));
        }
      });
      this.easystar.calculate();
    });
  }

  public async trouverCheminVersBatimentProche(
    pnj: PNJ,
    batiments: Batiment[],
    typeBatiment: string
  ): Promise<Position[]> {
    const batimentsType = batiments.filter(b => b.type === typeBatiment);
    if (batimentsType.length === 0) {
      throw new Error(`Aucun bâtiment de type ${typeBatiment} trouvé`);
    }

    if (!pnj.localisation?.position) {
      throw new Error("Le PNJ n'a pas de position définie");
    }

    let meilleurChemin: Position[] | null = null;
    let distanceMin = Infinity;

    for (const batiment of batimentsType) {
      try {
        const chemin = await this.trouverChemin(
          pnj.localisation.position,
          batiment.position
        );
        
        if (chemin.length < distanceMin) {
          distanceMin = chemin.length;
          meilleurChemin = chemin;
        }
      } catch (error) {
        console.warn(`Impossible de trouver un chemin vers le bâtiment ${batiment.id}:`, error);
      }
    }

    if (!meilleurChemin) {
      throw new Error(`Aucun chemin trouvé vers un bâtiment de type ${typeBatiment}`);
    }

    return meilleurChemin;
  }

  public async deplacerPNJVersDestination(
    pnj: PNJ,
    destination: Position,
    vitesse: number = 1
  ): Promise<void> {
    if (!pnj.localisation?.position) {
      throw new Error("Le PNJ n'a pas de position définie");
    }

    try {
      const chemin = await this.trouverChemin(pnj.localisation.position, destination);
      // Logique de déplacement à implémenter selon les besoins
      // Par exemple, déplacer le PNJ d'un certain nombre de cases selon sa vitesse
      console.log(`PNJ ${pnj.id} se déplace vers la destination`, chemin);
    } catch (error) {
      console.error(`Erreur lors du déplacement du PNJ ${pnj.id}:`, error);
      throw error;
    }
  }
}

// Exporter l'instance unique
export const pathfinder = PathfinderService.getInstance(); 