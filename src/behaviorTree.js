"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectuerActiviteNode = exports.EngagerConversationNode = exports.AllerVersBatimentNode = exports.PNJAProximiteNode = exports.EstExterieureNode = exports.EstDansBatimentNode = exports.BesoinCritiqueNode = exports.ActionNode = exports.ConditionNode = exports.SelectorNode = exports.SequenceNode = void 0;
exports.executerArbreComportement = executerArbreComportement;
const environnement_1 = require("./environnement");
const ia_1 = require("./ia");
const pnj_1 = require("./pnj");
const evenements_1 = require("./evenements");
// Nœud pour la séquence (exécute les enfants en séquence jusqu'à ce qu'un échec se produise)
class SequenceNode {
    constructor(children) {
        this.children = children;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const child of this.children) {
                const status = yield child.execute(pnj, context);
                if (status !== 'success') {
                    return status;
                }
            }
            return 'success';
        });
    }
}
exports.SequenceNode = SequenceNode;
// Nœud pour le sélecteur (exécute les enfants jusqu'à ce qu'un succès se produise)
class SelectorNode {
    constructor(children) {
        this.children = children;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const child of this.children) {
                const status = yield child.execute(pnj, context);
                if (status === 'success') {
                    return 'success';
                }
            }
            return 'failure';
        });
    }
}
exports.SelectorNode = SelectorNode;
// Nœud pour vérifier une condition
class ConditionNode {
    constructor(condition) {
        this.condition = condition;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.condition(pnj, context) ? 'success' : 'failure';
        });
    }
}
exports.ConditionNode = ConditionNode;
// Nœud pour exécuter une action
class ActionNode {
    constructor(action) {
        this.action = action;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.action(pnj, context);
        });
    }
}
exports.ActionNode = ActionNode;
// NŒUDS DE CONDITION SPÉCIFIQUES
// Vérifier si un besoin est en dessous du seuil
class BesoinCritiqueNode {
    constructor(besoin) {
        this.besoin = besoin;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            return pnj.besoins[this.besoin] < pnj_1.SEUILS[this.besoin] ? 'success' : 'failure';
        });
    }
}
exports.BesoinCritiqueNode = BesoinCritiqueNode;
// Vérifier si le PNJ est dans un bâtiment spécifique
class EstDansBatimentNode {
    constructor(typeBatiment) {
        this.typeBatiment = typeBatiment;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const lieu = (0, environnement_1.getLieuActuel)(pnj);
            if (!this.typeBatiment) {
                return ((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) ? 'success' : 'failure';
            }
            return lieu.type === this.typeBatiment ? 'success' : 'failure';
        });
    }
}
exports.EstDansBatimentNode = EstDansBatimentNode;
// Vérifier si le PNJ est à l'extérieur
class EstExterieureNode {
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return ((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.exterieur) ? 'success' : 'failure';
        });
    }
}
exports.EstExterieureNode = EstExterieureNode;
// Vérifier si un autre PNJ est à proximité
class PNJAProximiteNode {
    constructor(distance = 0) {
        this.distance = distance;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!context || !context.pnjs) {
                return 'failure';
            }
            // Vérifier si un autre PNJ est dans le même bâtiment ou à proximité
            const autresPNJs = context.pnjs.filter((autrePNJ) => {
                var _a, _b, _c, _d;
                if (autrePNJ.id === pnj.id)
                    return false;
                // Si les deux sont dans le même bâtiment
                if (((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) &&
                    pnj.localisation.batimentId === ((_b = autrePNJ.localisation) === null || _b === void 0 ? void 0 : _b.batimentId)) {
                    return true;
                }
                // Si les deux sont à l'extérieur et à proximité
                if (((_c = pnj.localisation) === null || _c === void 0 ? void 0 : _c.exterieur) && ((_d = autrePNJ.localisation) === null || _d === void 0 ? void 0 : _d.exterieur)) {
                    // Simplifié pour la démo: considérons qu'ils sont à proximité s'ils sont tous deux à l'extérieur
                    return true;
                }
                return false;
            });
            if (autresPNJs.length > 0) {
                // Stocker les PNJs à proximité dans le contexte pour utilisation future
                context.pnjsProximite = autresPNJs;
                return 'success';
            }
            return 'failure';
        });
    }
}
exports.PNJAProximiteNode = PNJAProximiteNode;
// NŒUDS D'ACTION SPÉCIFIQUES
// Se déplacer vers un bâtiment offrant un service
class AllerVersBatimentNode {
    constructor(service) {
        this.service = service;
    }
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const batiments = (0, environnement_1.getBatimentsParService)(this.service);
            if (batiments.length === 0) {
                console.log(`Aucun bâtiment offrant le service ${this.service} n'est disponible pour ${pnj.nom}`);
                return 'failure';
            }
            // Choisir le bâtiment le plus approprié (ici, simplement le premier disponible)
            const batiment = batiments[0];
            // Si déjà dans ce bâtiment, succès immédiat
            if (((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) === batiment.id) {
                return 'success';
            }
            // Tenter d'entrer dans le bâtiment
            const succes = (0, environnement_1.entrerDansBatiment)(pnj, batiment.id);
            if (succes) {
                console.log(`${pnj.nom} est allé vers ${batiment.nom} pour ${this.service}`);
                // Ajouter une entrée dans l'historique
                pnj.historique.push({
                    timestamp: Date.now(),
                    etat: this.serviceToEtat(this.service),
                    action: `${pnj.nom} se déplace vers ${batiment.nom}.`
                });
                // Mettre à jour l'état actuel
                pnj.etatActuel = this.serviceToEtat(this.service);
                return 'success';
            }
            return 'failure';
        });
    }
    // Convertir un service en état PNJ
    serviceToEtat(service) {
        const mapping = {
            'repas': { activite: 'repas' },
            'boissons': { activite: 'social' },
            'repos': { activite: 'repos' },
            'commerce': { activite: 'travail' },
            'formation': { activite: 'travail' },
            'soins': { activite: 'repos' },
            'priere': { activite: 'social' },
            'forge': { activite: 'travail' },
            'protection': { activite: 'travail' }
        };
        return mapping[service] || { activite: 'repos' };
    }
}
exports.AllerVersBatimentNode = AllerVersBatimentNode;
// S'engager dans une conversation avec un autre PNJ
class EngagerConversationNode {
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!context || !context.pnjsProximite || context.pnjsProximite.length === 0) {
                return 'failure';
            }
            // Choisir un PNJ pour converser
            const autrePNJ = context.pnjsProximite[0];
            // Générer le dialogue
            const dialogue = yield (0, ia_1.genererDialogue)(pnj, autrePNJ);
            // Augmenter le besoin social satisfait
            pnj.besoins.social += 20;
            if (pnj.besoins.social > 100)
                pnj.besoins.social = 100;
            // Ajouter une entrée dans l'historique
            pnj.historique.push({
                timestamp: Date.now(),
                etat: { activite: 'social' },
                action: `${pnj.nom} a une conversation avec ${autrePNJ.nom}: "${dialogue}"`
            });
            // Mettre à jour l'état actuel
            pnj.etatActuel = { activite: 'social' };
            console.log(`${pnj.nom} converse avec ${autrePNJ.nom}: "${dialogue}"`);
            return 'success';
        });
    }
}
exports.EngagerConversationNode = EngagerConversationNode;
// Effectuer une activité en fonction de la localisation actuelle
class EffectuerActiviteNode {
    execute(pnj, context) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const lieu = (0, environnement_1.getLieuActuel)(pnj);
            let activite = 'passe le temps';
            let etat = { activite: 'repos' };
            // Activité en fonction du type de bâtiment
            if (lieu && lieu.type) {
                switch (lieu.type) {
                    case 'restaurant':
                        activite = 'mange un repas';
                        etat = { activite: 'repas' };
                        pnj.besoins.faim += 40;
                        break;
                    case 'maison':
                        // On vérifie si c'est sa maison via la localisation
                        if (((_a = pnj.localisation) === null || _a === void 0 ? void 0 : _a.batimentId) === lieu.lieu) {
                            activite = 'se repose chez soi';
                            etat = { activite: 'repos' };
                            pnj.besoins.energie += 10;
                        }
                        else {
                            activite = 'visite quelqu\'un';
                            etat = { activite: 'social' };
                            pnj.besoins.social += 10;
                        }
                        break;
                    case 'parc':
                        activite = 'se promène dans le parc';
                        etat = { activite: 'loisir' };
                        pnj.besoins.divertissement += 15;
                        break;
                    case 'commerce':
                        activite = 'fait des achats';
                        etat = { activite: 'loisir' };
                        pnj.besoins.divertissement += 10;
                        break;
                    case 'bureau':
                        activite = 'travaille au bureau';
                        etat = { activite: 'travail' };
                        break;
                    case 'usine':
                        activite = 'travaille à l\'usine';
                        etat = { activite: 'travail' };
                        break;
                    case 'bar':
                        activite = 'prend un verre';
                        etat = { activite: 'social' };
                        pnj.besoins.social += 15;
                        pnj.besoins.divertissement += 10;
                        break;
                    case 'bibliothèque':
                        activite = 'lit à la bibliothèque';
                        etat = { activite: 'loisir' };
                        pnj.besoins.divertissement += 15;
                        break;
                    default:
                        activite = 'passe du temps à ' + lieu.lieu;
                        break;
                }
            }
            else if ((_b = pnj.localisation) === null || _b === void 0 ? void 0 : _b.exterieur) {
                activite = 'se promène dehors';
                etat = { activite: 'loisir' };
                pnj.besoins.divertissement += 5;
            }
            // Limiter les besoins à 100
            if (pnj.besoins.faim > 100)
                pnj.besoins.faim = 100;
            if (pnj.besoins.energie > 100)
                pnj.besoins.energie = 100;
            if (pnj.besoins.social > 100)
                pnj.besoins.social = 100;
            if (pnj.besoins.divertissement > 100)
                pnj.besoins.divertissement = 100;
            // Ajouter une entrée dans l'historique
            pnj.historique.push({
                timestamp: Date.now(),
                etat,
                action: `${pnj.nom} ${activite} à ${lieu ? lieu.lieu : 'un endroit inconnu'}`
            });
            // Mettre à jour l'état actuel
            pnj.etatActuel = etat;
            console.log(`${pnj.nom} ${activite} à ${lieu ? lieu.lieu : 'un endroit inconnu'}`);
            return 'success';
        });
    }
}
exports.EffectuerActiviteNode = EffectuerActiviteNode;
// CONSTRUCTION DES ARBRES DE COMPORTEMENT
// Construction de l'arbre pour la gestion des besoins critiques
function construireArbreBesoins() {
    // Arbre pour la gestion des besoins critiques
    return new SelectorNode([
        // Faim critique
        new SequenceNode([
            new BesoinCritiqueNode('faim'),
            new AllerVersBatimentNode('repas'),
            new ActionNode((pnj) => __awaiter(this, void 0, void 0, function* () {
                pnj.besoins.faim += 40;
                pnj.historique.push({
                    timestamp: Date.now(),
                    etat: { activite: 'repas' },
                    action: `${pnj.nom} a mangé et récupéré de la faim.`
                });
                return 'success';
            }))
        ]),
        // Fatigue critique
        new SequenceNode([
            new BesoinCritiqueNode('fatigue'),
            new AllerVersBatimentNode('repos'),
            new ActionNode((pnj) => __awaiter(this, void 0, void 0, function* () {
                pnj.besoins.energie += 40;
                pnj.historique.push({
                    timestamp: Date.now(),
                    etat: { activite: 'repos' },
                    action: `${pnj.nom} a dormi et récupéré de l'énergie.`
                });
                return 'success';
            }))
        ]),
        // Besoin social critique
        new SequenceNode([
            new BesoinCritiqueNode('social'),
            new AllerVersBatimentNode('boissons'),
            new ActionNode((pnj) => __awaiter(this, void 0, void 0, function* () {
                pnj.besoins.social += 40;
                pnj.historique.push({
                    timestamp: Date.now(),
                    etat: { activite: 'social' },
                    action: `${pnj.nom} a socialisé et amélioré son besoin social.`
                });
                return 'success';
            }))
        ]),
        // Besoin de divertissement critique
        new SequenceNode([
            new BesoinCritiqueNode('divertissement'),
            new AllerVersBatimentNode('commerce'),
            new ActionNode((pnj) => __awaiter(this, void 0, void 0, function* () {
                pnj.besoins.divertissement += 40;
                if (pnj.besoins.divertissement > 100)
                    pnj.besoins.divertissement = 100;
                pnj.historique.push({
                    timestamp: Date.now(),
                    etat: { activite: 'loisir' },
                    action: `${pnj.nom} s'est diverti et a récupéré du moral.`
                });
                return 'success';
            }))
        ])
    ]);
}
// Construction de l'arbre pour les activités normales
function construireArbreActivitesNormales() {
    // Suivre le planning si c'est l'heure de travail
    const suivrePlanning = new SequenceNode([
        // condition pour vérifier si c'est l'heure de travail selon l'emploi du temps
        new ConditionNode((pnj, context) => {
            if (!pnj.emploiDuTemps || !context || !context.timestamp)
                return false;
            const now = new Date(context.timestamp);
            const heure = now.getHours();
            const jour = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
            // Vérifier si l'horaire actuel correspond à une entrée dans l'emploi du temps
            // Parcourir les entrées de l'emploi du temps
            return Object.keys(pnj.emploiDuTemps).some(heureStr => {
                const h = parseInt(heureStr, 10);
                const activite = pnj.emploiDuTemps[h];
                // Simplification: si on est dans l'heure de l'emploi du temps, retourner vrai
                return h === heure;
            });
        }),
        new AllerVersBatimentNode('commerce')
    ]);
    // Socialiser avec d'autres PNJs si disponibles
    const socialiser = new SequenceNode([
        new PNJAProximiteNode(),
        new EngagerConversationNode()
    ]);
    // Effectuer une activité basée sur la localisation actuelle
    const effectuerActivite = new EffectuerActiviteNode();
    // Aller vers un lieu de loisir si rien d'autre à faire
    const allerVersLoisir = new AllerVersBatimentNode('formation');
    // Sélecteur qui choisit l'activité normale à faire
    return new SelectorNode([
        suivrePlanning,
        socialiser,
        effectuerActivite,
        allerVersLoisir
    ]);
}
// Fonction pour construire l'arbre de comportement complet
function construireArbreComportement() {
    return new SelectorNode([
        // Priorité 1: Réagir aux événements en cours
        new evenements_1.ReactionEvenementNode(),
        // Priorité 2: Satisfaire les besoins critiques
        construireArbreBesoins(),
        // Priorité 3: Activités normales
        construireArbreActivitesNormales()
    ]);
}
// Fonction principale pour exécuter l'arbre de comportement sur un PNJ
function executerArbreComportement(pnj, context) {
    return __awaiter(this, void 0, void 0, function* () {
        // Construire l'arbre de comportement
        const arbre = construireArbreComportement();
        // Exécuter l'arbre
        yield arbre.execute(pnj, context);
    });
}
