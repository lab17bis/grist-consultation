# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

## 2026-11-24

### Ajouté
- Bouton « Configurer » en haut de l'outil : ouvre une page de configuration unique en quatre onglets (Réglages, En-tête et pied, Aperçu, Publication). L'ancien lien « Réglages » en bas de page reste actif.
- Module commun `commun/configuration.js` et `commun/configuration.css`, partagé avec les autres widgets de la famille.
- Onglet Aperçu : l'en-tête et le pied de page tels qu'ils seront affichés, avec les réglages en cours, même non enregistrés.
- Onglet Publication : explique que l'outil est réservé aux personnes connectées, comment inviter l'équipe, et donne l'adresse du widget à copier.

### Modifié
- Les réglages existants (types de propositions, suites possibles, en-tête et pied) sont conservés tels quels, dans la colonne `Config_decision`.
- En mode démonstration, la page de configuration est visible mais n'enregistre rien.

## Versions antérieures

Voir l'historique des commits.
