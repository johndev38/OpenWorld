// Types d'états possibles pour un PNJ
// export type EtatPNJ = 'repos' | 'travail' | 'manger' | 'dormir' | 'socialiser' | 'loisir';

// Types de bâtiments disponibles dans l'environnement
export type TypeBatiment = 
  | 'maison'
  | 'magasin'
  | 'taverne'
  | 'forge'
  | 'bibliotheque'
  | 'marche'
  | 'temple'
  | 'caserne';

// Structure d'un bâtiment dans l'environnement
export interface Batiment {
  id: string;
  nom: string;
  type: TypeBatiment;
  position: Position;
  occupants: string[]; // Liste des IDs des PNJs présents dans le bâtiment
  dimensions?: {
    largeur: number;
    hauteur: number;
  };
  capacite: number;
  heureOuverture: number; // Heure d'ouverture (0-23)
  heureFermeture: number; // Heure de fermeture (0-23)
  services: Service[]; // Services disponibles dans le bâtiment
}

// Structure de l'environnement
export interface Environnement {
  heure: number; // 0-23
  minute: number; // 0-59
  jour: number; // 1-30
  meteo: 'ensoleillé' | 'nuageux' | 'pluvieux' | 'orageux' | 'neigeux';
  batiments: Batiment[];
}

// Structure des besoins d'un PNJ
export interface BesoinsPNJ {
  faim: number;      // 0-100, 0 = affamé, 100 = rassasié
  social: number;    // 0-100, 0 = isolé, 100 = comblé socialement
  sommeil: number;   // 0-100, 0 = épuisé, 100 = bien reposé
  energie: number;   // 0-100, 0 = sans énergie, 100 = plein d'énergie
  divertissement: number; // 0-100, 0 = ennuyé, 100 = diverti
}

export interface Position {
  x: number;
  y: number;
}

export interface Localisation {
  batimentId?: string;
  exterieur?: boolean;
  position: Position;
}

export type Personnalite = 
  | 'amical'
  | 'grognon'
  | 'serviable'
  | 'strict'
  | 'jovial'
  | 'mystérieux'
  | 'sage'
  | 'énergique';

export type Profession = 
  | 'maire'
  | 'tavernier'
  | 'forgeron'
  | 'bibliothécaire'
  | 'marchand'
  | 'prêtre'
  | 'garde'
  | 'paysan'
  | 'artisan';

export interface Besoins {
  faim: number;
  social: number;
  fatigue: number;
  soif: number;
  divertissement: number;
  energie: number;
}

export type Activite =
  | 'repos'
  | 'travail'
  | 'repas'
  | 'social'
  | 'loisir';

export interface EtatPNJ {
  activite: Activite;
  destination?: Position;
  batimentCible?: string;
}

export interface HistoriqueEntry {
  timestamp: number;
  etat: EtatPNJ;
  action: string;
}

// Structure principale d'un PNJ
export interface PNJ {
  id: string;
  nom: string;
  age: number;
  profession: Profession;
  personnalite: Personnalite;
  localisation: Localisation;
  sante: number; // 0-100
  bonheur: number; // 0-100
  background: string; // Histoire du personnage
  besoins: Besoins;
  etatActuel: EtatPNJ;
  historique: HistoriqueEntry[];
  energie: number; // 0-100
  emploiDuTemps?: Record<number, Activite>;
}

export type Service = 
  | 'repas'
  | 'boissons'
  | 'repos'
  | 'commerce'
  | 'formation'
  | 'soins'
  | 'priere'
  | 'forge'
  | 'protection'
  | 'divertissement';
  