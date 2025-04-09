import fs from 'fs';
import path from 'path';
import { PNJ, Position, Localisation } from '../types';
import { batimentService } from './BatimentService';
import { maisonService } from './MaisonService';
import EventEmitter from 'events';

export class PNJService extends EventEmitter {
  private static instance: PNJService;
  private pnjs: Map<string, PNJ>;
  private readonly dataDir = 'data/pnjs';

  private constructor() {
    super();
    this.pnjs = new Map();
    this.chargerPNJs();
  }

  public static getInstance(): PNJService {
    if (!PNJService.instance) {
      PNJService.instance = new PNJService();
    }
    return PNJService.instance;
  }

  private chargerPNJs(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(this.dataDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.dataDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const pnj = JSON.parse(data) as PNJ;
        this.pnjs.set(pnj.id, pnj);
      }
    });
  }

  public getPNJ(id: string): PNJ | undefined {
    return this.pnjs.get(id);
  }

  public getAllPNJs(): PNJ[] {
    return Array.from(this.pnjs.values());
  }

  public ajouterPNJ(pnj: PNJ): void {
    // Créer une maison pour le PNJ s'il n'en a pas déjà une
    if (!pnj.localisation?.batimentId) {
      try {
        const maison = maisonService.creerMaison(pnj);
        pnj.localisation = {
          batimentId: maison.id,
          position: maison.position,
          exterieur: false
        };
      } catch (error) {
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

  public mettreAJourPNJ(pnj: PNJ): void {
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

  private positionAChange(ancienne: Localisation, nouvelle: Localisation): boolean {
    if (!ancienne || !nouvelle) return true;
    
    return ancienne.batimentId !== nouvelle.batimentId ||
           ancienne.exterieur !== nouvelle.exterieur ||
           ancienne.position.x !== nouvelle.position.x ||
           ancienne.position.y !== nouvelle.position.y;
  }

  private gererChangementPosition(ancienPNJ: PNJ, nouveauPNJ: PNJ): void {
    // Gérer le départ d'un bâtiment
    if (ancienPNJ.localisation?.batimentId) {
      batimentService.retirerOccupant(ancienPNJ.localisation.batimentId, ancienPNJ.id);
    }

    // Gérer l'entrée dans un nouveau bâtiment
    if (nouveauPNJ.localisation?.batimentId) {
      batimentService.ajouterOccupant(nouveauPNJ.localisation.batimentId, nouveauPNJ.id);
    }

    // Émettre un événement de changement de position
    this.emit('pnj:position', {
      pnjId: nouveauPNJ.id,
      anciennePosition: ancienPNJ.localisation,
      nouvellePosition: nouveauPNJ.localisation
    });
  }

  private sauvegarderPNJ(pnj: PNJ): void {
    const filePath = path.join(this.dataDir, `${pnj.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pnj, null, 2), 'utf-8');
  }

  public supprimerPNJ(id: string): void {
    const pnj = this.pnjs.get(id);
    if (!pnj) {
      throw new Error(`PNJ avec l'ID ${id} non trouvé`);
    }

    // Retirer le PNJ de sa maison et des autres bâtiments
    maisonService.retirerPNJMaison(id);
    if (pnj.localisation?.batimentId) {
      batimentService.retirerOccupant(pnj.localisation.batimentId, id);
    }

    this.pnjs.delete(id);
    const filePath = path.join(this.dataDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    this.emit('pnj:supprime', id);
  }

  public deplacerPNJ(pnjId: string, nouvellePosition: Position, batimentId?: string): void {
    const pnj = this.getPNJ(pnjId);
    if (!pnj) {
      throw new Error(`PNJ avec l'ID ${pnjId} non trouvé`);
    }

    const nouvelleLocalisation: Localisation = {
      position: nouvellePosition,
      batimentId,
      exterieur: !batimentId
    };

    const pnjMisAJour = {
      ...pnj,
      localisation: nouvelleLocalisation
    };

    this.mettreAJourPNJ(pnjMisAJour);
  }
}

export const pnjService = PNJService.getInstance(); 