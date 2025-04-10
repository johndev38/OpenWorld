import { Batiment, TypeBatiment, Service, Position } from './types';
import fs from 'fs';
import path from 'path';

// Chemin vers le dossier de données des bâtiments
const ROOT_DIR = path.resolve(process.cwd());
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BATIMENTS_DIR = path.join(DATA_DIR, 'batiments');

// Fonction pour initialiser les dossiers nécessaires
export function initialiserDossiers() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`Création du dossier ${DATA_DIR}...`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Dossier ${DATA_DIR} créé avec succès.`);
    }
    
    if (!fs.existsSync(BATIMENTS_DIR)) {
      console.log(`Création du dossier ${BATIMENTS_DIR}...`);
      fs.mkdirSync(BATIMENTS_DIR, { recursive: true });
      console.log(`Dossier ${BATIMENTS_DIR} créé avec succès.`);
    }
  } catch (error) {
    console.error("Erreur lors de la création des dossiers:", error);
  }
}

// Fonction pour sauvegarder un bâtiment dans un fichier
export function sauvegarderBatiment(batiment: Batiment): void {
  try {
    // S'assurer que les dossiers existent
    initialiserDossiers();
    
    const filePath = path.join(BATIMENTS_DIR, `${batiment.id}.json`);
    console.log(`Sauvegarde du bâtiment ${batiment.nom} (${batiment.id}) dans ${filePath}...`);
    fs.writeFileSync(filePath, JSON.stringify(batiment, null, 2), 'utf8');
    console.log(`Bâtiment ${batiment.nom} sauvegardé avec succès dans ${filePath}`);
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde du bâtiment ${batiment.id}:`, error);
  }
}

// Fonction pour charger un bâtiment depuis un fichier
export function chargerBatiment(id: string): Batiment | null {
  const filePath = path.join(BATIMENTS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as Batiment;
  }
  return null;
}

// Fonction pour charger tous les bâtiments
export function chargerTousLesBatiments(): Batiment[] {
  if (!fs.existsSync(BATIMENTS_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(BATIMENTS_DIR);
  const batiments: Batiment[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(BATIMENTS_DIR, file);
      const data = fs.readFileSync(filePath, 'utf8');
      try {
        const batiment = JSON.parse(data) as Batiment;
        batiments.push(batiment);
      } catch (error) {
        console.error(`Erreur lors du chargement de ${file}:`, error);
      }
    }
  }
  
  return batiments;
} 