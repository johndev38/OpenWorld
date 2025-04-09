import fs from 'fs';
import path from 'path';
import { PNJ, EtatPNJ, BesoinsPNJ, Personnalite, Profession, Besoins } from './types';

// Chemin vers le dossier de données des PNJs
const ROOT_DIR = path.resolve(process.cwd());
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PNJ_DIR = path.join(DATA_DIR, 'pnjs');

// Constantes pour la simulation
export const TICK_INTERVAL = 10000; // 10 secondes par tick
export const BESOINS_DECAY = {
  faim: 2,        // Perte de satiété par tick
  social: 1,      // Perte sociale par tick
  fatigue: 3,     // Perte de repos par tick
  energie: 2,     // Perte d'énergie par tick
  divertissement: 2,  // Perte de divertissement par tick
  soif: 2
};

// Seuils pour les transitions d'état
export const SEUILS = {
  faim: 30,       // En dessous, le PNJ a besoin de manger
  social: 20,     // En dessous, le PNJ a besoin de socialiser
  fatigue: 25,    // En dessous, le PNJ a besoin de dormir
  energie: 20,    // En dessous, le PNJ a besoin de repos
  divertissement: 25 // En dessous, le PNJ a besoin de loisirs
};

// Créer les dossiers nécessaires s'ils n'existent pas
export function initialiserDossiers() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`Création du dossier ${DATA_DIR}...`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`Dossier ${DATA_DIR} créé avec succès.`);
    }
    
    if (!fs.existsSync(PNJ_DIR)) {
      console.log(`Création du dossier ${PNJ_DIR}...`);
      fs.mkdirSync(PNJ_DIR, { recursive: true });
      console.log(`Dossier ${PNJ_DIR} créé avec succès.`);
    }
  } catch (error) {
    console.error("Erreur lors de la création des dossiers:", error);
  }
}

// Fonction pour sauvegarder un PNJ dans un fichier
export function sauvegarderPNJ(pnj: PNJ): void {
  try {
    // S'assurer que les dossiers existent
    initialiserDossiers();
    
    const filePath = path.join(PNJ_DIR, `${pnj.id}.json`);
    console.log(`Sauvegarde du PNJ ${pnj.nom} (${pnj.id}) dans ${filePath}...`);
    fs.writeFileSync(filePath, JSON.stringify(pnj, null, 2), 'utf8');
    console.log(`PNJ ${pnj.nom} sauvegardé avec succès dans ${filePath}`);
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde du PNJ ${pnj.id}:`, error);
  }
}

// Fonction pour charger un PNJ depuis un fichier
export function chargerPNJ(id: string): PNJ | null {
  const filePath = path.join(PNJ_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as PNJ;
  }
  return null;
}

// Fonction pour charger tous les PNJ
export function chargerTousLesPNJ(): PNJ[] {
  if (!fs.existsSync(PNJ_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(PNJ_DIR);
  const pnjs: PNJ[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(PNJ_DIR, file);
      const data = fs.readFileSync(filePath, 'utf8');
      try {
        const pnj = JSON.parse(data) as PNJ;
        pnjs.push(pnj);
      } catch (error) {
        console.error(`Erreur lors du chargement de ${file}:`, error);
      }
    }
  }
  
  return pnjs;
}

// Fonction pour déterminer un nouvel état basé sur les besoins
export function determinerNouvelEtat(pnj: PNJ): EtatPNJ {
  const besoins = pnj.besoins;
  
  // Vérifier les besoins critiques en premier
  if (besoins.fatigue < SEUILS.fatigue) {
    return { activite: 'repos' };
  } else if (besoins.faim < SEUILS.faim) {
    return { activite: 'repas' };
  } else if (besoins.energie < SEUILS.energie) {
    return { activite: 'repos' };
  } else if (besoins.social < SEUILS.social) {
    return { activite: 'social' };
  } else if (besoins.divertissement < SEUILS.divertissement) {
    return { activite: 'loisir' };
  }
  
  // Si aucun besoin critique, continuer son activité ou travailler
  return pnj.etatActuel.activite !== 'travail' ? { activite: 'travail' } : pnj.etatActuel;
}

// Fonction pour mettre à jour les besoins d'un PNJ
export function mettreAJourBesoins(pnj: PNJ): Besoins {
  const besoins = { ...pnj.besoins };
  const etat = pnj.etatActuel.activite;
  
  // Diminution naturelle des besoins
  besoins.faim = Math.max(0, besoins.faim - BESOINS_DECAY.faim);
  besoins.social = Math.max(0, besoins.social - BESOINS_DECAY.social);
  besoins.fatigue = Math.max(0, besoins.fatigue - BESOINS_DECAY.fatigue);
  besoins.energie = Math.max(0, besoins.energie - BESOINS_DECAY.energie);
  besoins.divertissement = Math.max(0, besoins.divertissement - BESOINS_DECAY.divertissement);
  besoins.soif = Math.max(0, besoins.soif - BESOINS_DECAY.soif);
  
  // Augmentation des besoins selon l'activité
  switch (etat) {
    case 'repas':
      besoins.faim = Math.min(100, besoins.faim + 15);
      break;
    case 'repos':
      besoins.fatigue = Math.min(100, besoins.fatigue + 20);
      besoins.energie = Math.min(100, besoins.energie + 10);
      break;
    case 'social':
      besoins.social = Math.min(100, besoins.social + 20);
      besoins.divertissement = Math.min(100, besoins.divertissement + 5);
      break;
    case 'loisir':
      besoins.divertissement = Math.min(100, besoins.divertissement + 20);
      besoins.energie = Math.min(100, besoins.energie + 5);
      break;
    case 'travail':
      // Le travail peut être légèrement socialisant
      besoins.social = Math.min(100, besoins.social + 3);
      // Mais il consomme de l'énergie
      besoins.energie = Math.max(0, besoins.energie - 3);
      break;
  }
  
  return besoins;
}

// Fonction pour générer un message décrivant l'action actuelle du PNJ
export function genererActionDescription(pnj: PNJ): string {
  const etat = pnj.etatActuel.activite;
  const nom = pnj.nom;
  
  // Générateur de descriptions basiques
  const descriptions = {
    travail: [
      `${nom} travaille avec concentration.`,
      `${nom} est occupé(e) à sa tâche professionnelle.`,
      `${nom} exerce son métier de ${pnj.profession}.`
    ],
    repos: [
      `${nom} se repose tranquillement.`,
      `${nom} prend un moment pour récupérer.`,
      `${nom} se détend et reprend des forces.`
    ],
    repas: [
      `${nom} prend un repas.`,
      `${nom} savoure sa nourriture.`,
      `${nom} se restaure.`
    ],
    social: [
      `${nom} discute avec d'autres personnes.`,
      `${nom} partage un moment social.`,
      `${nom} est en pleine conversation.`
    ],
    loisir: [
      `${nom} profite d'une activité de loisir.`,
      `${nom} se divertit.`,
      `${nom} prend du bon temps.`
    ]
  };
  
  // Sélection aléatoire d'une description pour l'état actuel
  const possibleDescriptions = descriptions[etat as keyof typeof descriptions];
  return possibleDescriptions[Math.floor(Math.random() * possibleDescriptions.length)];
}

// Fonction pour générer un PNJ avec des valeurs par défaut
export function creerPNJParDefaut(
  nom: string, 
  age: number, 
  profession: Profession, 
  personnalite: Personnalite
): PNJ {
  const id = `pnj_${Date.now()}`;
  
  return {
    id,
    nom,
    age,
    personnalite,
    profession,
    background: `${nom} est un(e) ${profession} de ${age} ans avec une personnalité ${personnalite}.`,
    besoins: {
      faim: Math.floor(Math.random() * 20) + 70, // 70-90
      social: Math.floor(Math.random() * 30) + 60, // 60-90
      fatigue: Math.floor(Math.random() * 30) + 60, // 60-90
      energie: Math.floor(Math.random() * 20) + 70, // 70-90
      divertissement: Math.floor(Math.random() * 30) + 60, // 60-90
      soif: Math.floor(Math.random() * 30) + 60 // 60-90
    },
    etatActuel: { activite: 'repos' },
    historique: [],
    localisation: { position: { x: 0, y: 0 } },
    sante: 100,
    energie: 100,
    bonheur: 100
  };
} 