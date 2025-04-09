import { PNJ, Position } from '../types';
import { PathfindingService } from './PathfindingService';
import { BatimentService } from './BatimentService';
import EventEmitter from 'events';

export class DeplacementService extends EventEmitter {
  private static instance: DeplacementService;
  private pathfinding: PathfindingService;
  private batimentService: BatimentService;
  private deplacements: Map<string, {
    chemin: Position[],
    etapeActuelle: number,
    destination: Position,
    batimentCible?: string
  }> = new Map();
  
  // Vitesse de déplacement des PNJ (cases par tick)
  private vitesseDeplacement = 1;

  private constructor() {
    super();
    this.pathfinding = PathfindingService.getInstance();
    this.batimentService = BatimentService.getInstance();
  }

  public static getInstance(): DeplacementService {
    if (!DeplacementService.instance) {
      DeplacementService.instance = new DeplacementService();
    }
    return DeplacementService.instance;
  }

  /**
   * Déplace un PNJ vers une destination
   */
  public deplacerVers(pnj: PNJ, destination: Position, batimentCible?: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Si le PNJ est déjà à destination, on ne fait rien
      if (this.estADestination(pnj.localisation.position, destination)) {
        console.log(`${pnj.nom} est déjà à destination`);
        resolve(true);
        return;
      }

      console.log(`🚶 DÉPLACEMENT: ${pnj.nom} commence son trajet depuis [${pnj.localisation.position.x}, ${pnj.localisation.position.y}] vers [${destination.x}, ${destination.y}]${batimentCible ? ` (${batimentCible})` : ''}`);

      // Trouver un chemin vers la destination
      this.pathfinding.trouverChemin(
        pnj.localisation.position,
        destination,
        (chemin) => {
          if (!chemin) {
            console.error(`❌ PATHFINDING: Aucun chemin trouvé pour ${pnj.nom} vers la destination [${destination.x}, ${destination.y}]`);
            resolve(false);
            return;
          }

          console.log(`🗺️ PATHFINDING: Chemin trouvé pour ${pnj.nom} - ${chemin.length} étapes`);

          // Enregistrer le déplacement
          this.deplacements.set(pnj.id, {
            chemin,
            etapeActuelle: 0,
            destination,
            batimentCible
          });

          // Mettre à jour l'état du PNJ
          pnj.etatActuel.destination = destination;
          pnj.etatActuel.batimentCible = batimentCible;

          // Ajouter une entrée dans l'historique
          pnj.historique.push({
            timestamp: Date.now(),
            etat: { 
              activite: pnj.etatActuel.activite,
              destination, 
              batimentCible 
            },
            action: `${pnj.nom} commence à se déplacer vers ${batimentCible || 'une destination'}.`
          });

          console.log(`✅ DÉPLACEMENT: ${pnj.nom} a commencé son déplacement vers ${batimentCible || 'une destination'}`);
          resolve(true);
        }
      );
    });
  }

  /**
   * Déplace un PNJ vers un bâtiment par son type
   */
  public deplacerVersBatiment(pnj: PNJ, typeBatiment: string): Promise<boolean> {
    // Trouver tous les bâtiments du type demandé
    const batiments = this.batimentService.getBatimentsParType(typeBatiment);
    
    if (batiments.length === 0) {
      console.error(`Aucun bâtiment de type ${typeBatiment} trouvé`);
      return Promise.resolve(false);
    }

    // Prendre le bâtiment le plus proche
    const batimentProche = batiments.reduce((plus_proche, batiment) => {
      const distance = this.calculerDistance(pnj.localisation.position, batiment.position);
      const distance_plus_proche = this.calculerDistance(pnj.localisation.position, plus_proche.position);
      
      return distance < distance_plus_proche ? batiment : plus_proche;
    });

    // Déplacer le PNJ vers ce bâtiment
    return this.deplacerVers(pnj, batimentProche.position, batimentProche.id);
  }

  /**
   * Met à jour la position de tous les PNJ en cours de déplacement
   */
  public mettreAJourDeplacements(pnjs: PNJ[]): void {
    pnjs.forEach(pnj => {
      const deplacement = this.deplacements.get(pnj.id);
      
      if (!deplacement) return; // PNJ pas en déplacement
      
      // Si on est arrivé à la fin du chemin
      if (deplacement.etapeActuelle >= deplacement.chemin.length - 1) {
        // Arrivée à destination
        pnj.localisation.position = deplacement.destination;
        
        console.log(`🏁 ARRIVÉE: ${pnj.nom} est arrivé à destination [${deplacement.destination.x}, ${deplacement.destination.y}]${deplacement.batimentCible ? ` (${deplacement.batimentCible})` : ''}`);
        
        // Ajouter une entrée dans l'historique
        pnj.historique.push({
          timestamp: Date.now(),
          etat: { 
            activite: pnj.etatActuel.activite,
            batimentCible: deplacement.batimentCible 
          },
          action: `${pnj.nom} est arrivé à ${deplacement.batimentCible || 'destination'}.`
        });
        
        // Nettoyer l'état de déplacement
        pnj.etatActuel.destination = undefined;
        this.deplacements.delete(pnj.id);
        
        // Émettre un événement d'arrivée
        this.emit('arrivee', pnj, deplacement.batimentCible);
        
        return;
      }
      
      // Sinon, avancer vers la prochaine étape
      const prochaineEtape = Math.min(
        deplacement.etapeActuelle + this.vitesseDeplacement,
        deplacement.chemin.length - 1
      );
      
      // Ancienne position
      const anciennePosition = { ...pnj.localisation.position };
      
      // Mettre à jour la position du PNJ
      pnj.localisation.position = deplacement.chemin[prochaineEtape];
      deplacement.etapeActuelle = prochaineEtape;
      
      // Log détaillé tous les 5 pas
      if (prochaineEtape % 5 === 0 || prochaineEtape === deplacement.chemin.length - 2) {
        console.log(`🔄 PROGRESSION: ${pnj.nom} se déplace de [${anciennePosition.x.toFixed(1)}, ${anciennePosition.y.toFixed(1)}] vers [${pnj.localisation.position.x.toFixed(1)}, ${pnj.localisation.position.y.toFixed(1)}] - Étape ${prochaineEtape + 1}/${deplacement.chemin.length}`);
      }
    });
  }

  /**
   * Vérifie si un PNJ est en déplacement
   */
  public estEnDeplacement(pnjId: string): boolean {
    return this.deplacements.has(pnjId);
  }

  /**
   * Annule le déplacement d'un PNJ
   */
  public annulerDeplacement(pnj: PNJ): void {
    if (this.deplacements.has(pnj.id)) {
      // Ajouter une entrée dans l'historique
      pnj.historique.push({
        timestamp: Date.now(),
        etat: pnj.etatActuel,
        action: `${pnj.nom} a interrompu son déplacement.`
      });
      
      // Nettoyer l'état de déplacement
      pnj.etatActuel.destination = undefined;
      pnj.etatActuel.batimentCible = undefined;
      this.deplacements.delete(pnj.id);
    }
  }

  /**
   * Vérifie si une position est proche d'une autre (arrivée à destination)
   */
  private estADestination(position: Position, destination: Position, tolerance: number = 0.5): boolean {
    return this.calculerDistance(position, destination) <= tolerance;
  }

  /**
   * Calcule la distance euclidienne entre deux positions
   */
  private calculerDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
} 