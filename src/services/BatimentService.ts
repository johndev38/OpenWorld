import fs from 'fs';
import path from 'path';
import { Batiment } from '../types';

export class BatimentService {
  private static instance: BatimentService;
  private batiments: Map<string, Batiment>;
  private readonly dataDir = 'data/batiments';

  private constructor() {
    this.batiments = new Map();
    this.chargerBatiments();
  }

  public static getInstance(): BatimentService {
    if (!BatimentService.instance) {
      BatimentService.instance = new BatimentService();
    }
    return BatimentService.instance;
  }

  private chargerBatiments(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(this.dataDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.dataDir, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const batiment = JSON.parse(data) as Batiment;
        this.batiments.set(batiment.id, batiment);
      }
    });
  }

  public getBatiment(id: string): Batiment | undefined {
    return this.batiments.get(id);
  }

  public getAllBatiments(): Batiment[] {
    return Array.from(this.batiments.values());
  }

  public getBatimentsParType(type: string): Batiment[] {
    return Array.from(this.batiments.values()).filter(b => b.type === type);
  }

  public ajouterBatiment(batiment: Batiment): void {
    this.batiments.set(batiment.id, batiment);
    this.sauvegarderBatiment(batiment);
  }

  public mettreAJourBatiment(batiment: Batiment): void {
    if (!this.batiments.has(batiment.id)) {
      throw new Error(`Bâtiment avec l'ID ${batiment.id} non trouvé`);
    }
    this.batiments.set(batiment.id, batiment);
    this.sauvegarderBatiment(batiment);
  }

  private sauvegarderBatiment(batiment: Batiment): void {
    const filePath = path.join(this.dataDir, `${batiment.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(batiment, null, 2), 'utf-8');
  }

  public supprimerBatiment(id: string): void {
    if (!this.batiments.has(id)) {
      throw new Error(`Bâtiment avec l'ID ${id} non trouvé`);
    }
    this.batiments.delete(id);
    const filePath = path.join(this.dataDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  public ajouterOccupant(batimentId: string, pnjId: string): void {
    const batiment = this.getBatiment(batimentId);
    if (!batiment) {
      throw new Error(`Bâtiment avec l'ID ${batimentId} non trouvé`);
    }
    if (!batiment.occupants.includes(pnjId)) {
      batiment.occupants.push(pnjId);
      this.mettreAJourBatiment(batiment);
    }
  }

  public retirerOccupant(batimentId: string, pnjId: string): void {
    const batiment = this.getBatiment(batimentId);
    if (!batiment) {
      throw new Error(`Bâtiment avec l'ID ${batimentId} non trouvé`);
    }
    batiment.occupants = batiment.occupants.filter(id => id !== pnjId);
    this.mettreAJourBatiment(batiment);
  }
}

export const batimentService = BatimentService.getInstance(); 