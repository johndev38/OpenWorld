import { Batiment, PNJ, Position } from '../types';
import { batimentService } from './BatimentService';

export class MaisonService {
  private static instance: MaisonService;
  private zonesHabitation: Position[] = [
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
  private positionsUtilisees: Set<string> = new Set();

  private constructor() {
    // Charger les positions déjà utilisées depuis les maisons existantes
    const batiments = batimentService.getAllBatiments();
    batiments
      .filter(b => b.type === 'maison')
      .forEach(b => this.positionsUtilisees.add(`${b.position.x},${b.position.y}`));
  }

  public static getInstance(): MaisonService {
    if (!MaisonService.instance) {
      MaisonService.instance = new MaisonService();
    }
    return MaisonService.instance;
  }

  private trouverPositionDisponible(): Position | null {
    for (const position of this.zonesHabitation) {
      const positionKey = `${position.x},${position.y}`;
      if (!this.positionsUtilisees.has(positionKey)) {
        this.positionsUtilisees.add(positionKey);
        return position;
      }
    }
    return null;
  }

  public creerMaison(pnj: PNJ): Batiment {
    const position = this.trouverPositionDisponible();
    if (!position) {
      throw new Error("Plus de place disponible pour construire une nouvelle maison");
    }

    const maison: Batiment = {
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

    batimentService.ajouterBatiment(maison);
    return maison;
  }

  public attribuerMaisonExistante(pnj: PNJ, maisonId: string): void {
    const maison = batimentService.getBatiment(maisonId);
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
    batimentService.ajouterOccupant(maisonId, pnj.id);
  }

  public trouverMaisonPNJ(pnjId: string): Batiment | undefined {
    return batimentService
      .getAllBatiments()
      .find(b => b.type === 'maison' && b.occupants.includes(pnjId));
  }

  public retirerPNJMaison(pnjId: string): void {
    const maison = this.trouverMaisonPNJ(pnjId);
    if (maison) {
      batimentService.retirerOccupant(maison.id, pnjId);
    }
  }
}

export const maisonService = MaisonService.getInstance(); 