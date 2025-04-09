import { Activite, EtatPNJ } from '../types';
// ... existing code ...
function creerEtatInitial(): EtatPNJ {
  return {
    activite: 'repos' as Activite,
    destination: undefined,
    batimentCible: undefined
  };
}
// ... existing code ...