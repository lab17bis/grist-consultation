# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

## 2026-11-26 (niveaux d'identification)

### Ajouté
- Cinq niveaux d'identification du vote public, au choix par consultation : ouvert, courriel déclaré, code commun, code individuel, compte Grist. Interface dans *Réglages*, avec pour chaque niveau ce qu'il garantit, pourquoi le choisir et sa limite.
- Code commun : un seul code pour tout le groupe, créé et changé depuis les réglages, stocké dans la table des codes (jamais lu par la page publique).
- Courriel déclaré : un vote retenu par adresse (colonne `Votes.Courriel`).
- Bouton *Mettre à jour le contrôle du vote* pour les documents installés avant les niveaux : la colonne `Bulletin` devient du texte et reçoit la formule d'identité ; les données ne sont pas touchées.
- Texte d'appel au vote de la page publique adapté au niveau choisi.

### Modifié
- La colonne `Votes.Bulletin` est désormais une clé de texte (`c:12`, `m:adresse`, `u:adresse`, `o:45`) au lieu d'un numéro ; la colonne `Codes_vote.Utilise` suit.
- Sans niveau choisi, le comportement reste celui d'avant (code individuel quand le contrôle est installé).
- Vérifié dans un vrai document Grist : 26 votes d'essai répartis sur les cinq niveaux et un vote par points.

## 2026-11-26 (deux façons de voter)

### Ajouté
- README : comparaison du vote identifié (dans Grist) et du vote public par code ; ce que la page publique montre ou masque ; adresse `?style=light` pour afficher la page du widget sans les menus Grist.

## 2026-11-26 (documentation du vote public)

### Corrigé
- README : le vote public passe par un questionnaire (grist-questionnaire) branché sur la table `Votes`, pas par un formulaire natif de Grist ; le portail assemble la page de consultation et la page de vote sous une seule adresse. Aucun changement de code.

## 2026-11-26 (champs supplémentaires)

### Ajouté
- Champs supplémentaires des propositions (Configurer › Réglages) : texte court ou long, choix dans une liste, date ou nombre, obligatoires ou non. Chaque champ crée une colonne dans `Propositions` à l'enregistrement des réglages, apparaît dans le formulaire de dépôt et sur la fiche de la proposition.

### Corrigé
- Réglages : les actions (vote par code, champs) restent actives après un changement de consultation ou un nouveau dessin de l'onglet.

### Tests
- Nouveau test de l'ajout d'un champ dans les réglages (création de la colonne).

### Inchangé
- Sans champ supplémentaire, le dépôt et la fiche sont identiques à avant.

## 2026-11-26 (vote public contrôlé)

### Ajouté
- Vote public contrôlé par code personnel : table `Codes_vote`, colonnes `Code`, `Bulletin` et `Valide` dans `Votes`, activés par un propriétaire (Configurer › Réglages › Vote public contrôlé). Un code inconnu ou absent est ignoré ; un code ne compte qu'une fois par proposition (premier vote retenu) ; plafonds de points vérifiés par Grist ; un code ne vaut que pour sa consultation.
- Création de codes par consultation (liste de destinataires ou nombre de codes anonymes) et export CSV pour envoyer chaque code.
- Les votes anonymes sans code sont ignorés quand le vote contrôlé est activé.

### Inchangé
- Les documents qui n'activent pas le vote par code se comportent exactement comme avant.

## 2026-11-25 (mention de conception)

### Ajouté
- Mention discrète en pied de page, sur l'outil comme sur ses pages publiques : « Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims ».

## 2026-11-25 (aperçu réel)

### Amélioré
- Onglet « Aperçu » de la configuration : il montre maintenant l'outil de consultation elle-même, entre l'en-tête et le pied de page, au lieu d'un exemple fixe. Les réglages en cours de saisie, même non enregistrés, s'appliquent le temps de l'aperçu ; en quittant l'onglet, l'outil revient à ses réglages enregistrés.
- Dans l'aperçu, l'outil est réellement actif : ce que vous y faites s'applique au document. Un message le rappelle.

## 2026-11-25 (règles d'accès des votes)

### Documentation
- Nouvelle section « Protéger les votes par des règles d'accès » : quatre règles Grist, vérifiées sur une instance réelle, qui empêchent d'écrire, modifier ou retirer un vote au nom d'une autre personne.

## 2026-11-25 (audit de sécurité)

### Sécurité
- Les liens venant des données ou des réglages sont vérifiés par le navigateur lui-même : une adresse déguisée (« java⇥script: » avec tabulation, retour à la ligne ou caractère de contrôle) n'est plus acceptée. Elle permettait, sur le portail, d'exécuter du script au clic depuis une adresse fabriquée.
- Politique de sécurité de contenu stricte : seuls les scripts du site, l'API Grist et les scripts de la page connus par leur empreinte peuvent s'exécuter. L'évaluation de texte (« unsafe-eval ») reste permise : l'API officielle de Grist en a besoin (sans elle, les widgets restaient bloqués sur « Chargement… » dans Grist le 25/11 au matin). Un script injecté (lien javascript:, attribut onerror…) est bloqué même si un filtre le laissait passer.
- Page publique : message clair si le document Grist est injoignable (au lieu de « Failed to fetch »).

### Corrigé
- Ordinateur partagé : l'identité gardée par le navigateur est revérifiée auprès de Grist avant la première écriture. Si la personne connectée a changé, l'action est annulée et un message l'explique (avant, retirer « son » soutien pouvait retirer celui de la personne précédente).

## 2026-11-24 (durcissement)

### Sécurité
- Les pages ajoutent une politique de sécurité de contenu minimale (pas d'objets embarqués, pas de balise base).
- Les pages publiques n'acceptent plus qu'un lien de document Grist en https (http seulement pour localhost, en développement).

## 2026-11-24 (message de lecture publique)

### Corrigé
- Page publique : quand une table est masquée par les règles d'accès du document, le message nomme la table et explique la cause (erreur 403), au lieu de demander si le document est partagé. Comportement vérifié sur un vrai document Grist : une table refusée au public répond 403, une colonne refusée disparaît des lignes, les personnes connectées gardent leurs droits.

## 2026-11-24 (règles d'accès)

### Corrigé
- Page publique : une table ou une colonne masquée par les règles d'accès du document (par exemple les adresses de courriel) n'empêche plus d'afficher le reste de la page.
- L'outil de consultation n'affiche plus l'écran d'installation quand la table des votants est masquée : la page publique n'a jamais besoin de cette table. Si une autre table est illisible, un message l'explique au lieu de proposer d'installer l'outil.

### Ajouté
- Documentation de la page publique (README) : réglages, ce qui est lu, ce qui reste caché, règles d'accès à poser.

## 2026-11-24 (page publique)

### Ajouté
- Page publique en lecture seule : consultations, propositions, résultats et suites données. L'adresse `index.html?public=1&doc=<lien du document Grist>&table=Consultations` l'affiche sans compte Grist.
- La table des votants (adresses de courriel) n'est jamais lue par la page publique, et les votants des votes sont remplacés par un numéro.
- Le vote se fait dans un questionnaire : réglage « Lien du questionnaire de vote » (`{consultation}` est remplacé par le numéro de la consultation), la page publique propose un bouton « Voter ».
- Module commun `commun/grist-public.js` (et `.css`) : lit le document par l'API REST de Grist, en lecture seule, sans compte.
- Onglet Publication : saisissez le lien du document Grist partagé en lecture publique, l'outil construit le lien de la page publique, à copier ou à ouvrir ; le lien est enregistré avec les réglages.
- Option `integre=1` : page sans en-tête ni pied propres, pour l'intégrer dans un autre site.

## 2026-11-24 (renommage)

### Modifié
- L'outil s'appelle désormais **grist-consultation** (dépôt, adresse publique `lab17bis.github.io/grist-consultation/v1/`, documentation). L'ancien nom `grist-decision` n'est plus publié : mettez à jour l'adresse du widget dans vos documents.
- Les réglages déjà enregistrés sont conservés : la colonne `Config_decision` est toujours lue et réécrite ; les nouveaux documents utilisent `Config_consultation`.

## 2026-11-24 (barre d'onglets permanente)

### Modifié
- Le widget s'ouvre désormais sur une barre d'onglets, comme le catalogue et le questionnaire : *Consultations*, puis les onglets de réglages, En-tête et pied, Aperçu, Publication. L'outil lui-même est le premier onglet.
- Le bouton « Configurer » laisse la place à la barre d'onglets ; les anciens liens et boutons « Réglages » restent actifs et ouvrent l'onglet Réglages.
- L'enregistrement des réglages reste dans la colonne de configuration existante : rien à migrer.

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
