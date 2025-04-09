"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genererBatiments = genererBatiments;
const BatimentService_1 = require("../services/BatimentService");
const batiments = [
    {
        id: 'maison_maire',
        nom: 'Maison du Maire',
        type: 'maison',
        position: { x: 25, y: 25 },
        occupants: [],
        dimensions: { largeur: 3, hauteur: 3 },
        capacite: 4,
        heureOuverture: 8,
        heureFermeture: 20,
        services: ['repos']
    },
    {
        id: 'taverne_dragon_dore',
        nom: 'Taverne du Dragon Doré',
        type: 'taverne',
        position: { x: 15, y: 20 },
        occupants: [],
        dimensions: { largeur: 4, hauteur: 3 },
        capacite: 20,
        heureOuverture: 10,
        heureFermeture: 2, // Ferme à 2h du matin
        services: ['repas', 'boissons', 'repos']
    },
    {
        id: 'forge_enclume_ardente',
        nom: "Forge de l'Enclume Ardente",
        type: 'forge',
        position: { x: 35, y: 15 },
        occupants: [],
        dimensions: { largeur: 2, hauteur: 2 },
        capacite: 3,
        heureOuverture: 6,
        heureFermeture: 18,
        services: ['forge', 'commerce']
    },
    {
        id: 'bibliotheque_ancienne',
        nom: 'Bibliothèque Ancienne',
        type: 'bibliotheque',
        position: { x: 30, y: 30 },
        occupants: [],
        dimensions: { largeur: 3, hauteur: 4 },
        capacite: 15,
        heureOuverture: 9,
        heureFermeture: 17,
        services: ['formation', 'repos']
    },
    {
        id: 'marche_central',
        nom: 'Marché Central',
        type: 'marche',
        position: { x: 20, y: 25 },
        occupants: [],
        dimensions: { largeur: 5, hauteur: 5 },
        capacite: 50,
        heureOuverture: 6,
        heureFermeture: 18,
        services: ['commerce', 'repas']
    },
    {
        id: 'temple_lumiere',
        nom: 'Temple de la Lumière',
        type: 'temple',
        position: { x: 40, y: 40 },
        occupants: [],
        dimensions: { largeur: 4, hauteur: 4 },
        capacite: 30,
        heureOuverture: 6,
        heureFermeture: 20,
        services: ['priere', 'soins', 'repos']
    },
    {
        id: 'caserne_garde',
        nom: 'Caserne de la Garde',
        type: 'caserne',
        position: { x: 10, y: 35 },
        occupants: [],
        dimensions: { largeur: 4, hauteur: 3 },
        capacite: 20,
        heureOuverture: 0,
        heureFermeture: 24, // Ouvert 24/24
        services: ['protection', 'formation']
    },
    {
        id: 'magasin_general',
        nom: 'Magasin Général',
        type: 'magasin',
        position: { x: 25, y: 15 },
        occupants: [],
        dimensions: { largeur: 2, hauteur: 2 },
        capacite: 8,
        heureOuverture: 8,
        heureFermeture: 19,
        services: ['commerce']
    }
];
// Fonction pour générer les bâtiments
function genererBatiments() {
    console.log('Génération des bâtiments...');
    batiments.forEach(batiment => {
        try {
            BatimentService_1.batimentService.ajouterBatiment(batiment);
            console.log(`✅ Bâtiment créé : ${batiment.nom} (${batiment.type})`);
        }
        catch (error) {
            console.error(`❌ Erreur lors de la création du bâtiment ${batiment.nom}:`, error);
        }
    });
    console.log(`\nTotal des bâtiments générés : ${batiments.length}`);
}
// Exécuter la génération si le script est appelé directement
if (require.main === module) {
    genererBatiments();
}
