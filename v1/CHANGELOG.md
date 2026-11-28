# Journal des modifications

Les adresses `/v1/` ne changent pas : chaque version ajoute ou corrige, sans retirer ce qui existe.

## 2026-11-28 (fichier partagé des données)
- Fichier partagé `commun/donnees.js` mis à jour (identique dans grist-management, grist-reunion et grist-consultation) : il sait poser un attribut d'utilisateur (par exemple la fiche de la personne connectée) avec les règles d'accès proposées. Rien ne change pour cet outil.

## 2026-11-28 (échéance et liens par proposition)
- **Échéance contrôlée par Grist** pour les votes publics : un vote reçu après le jour d'échéance est ignoré ; à la fermeture du vote, l'outil gèle les votes publics (colonne `Consultations.Cloture_vote`) : tout vote plus récent est ignoré, même avec une date falsifiée. Rouvrir le vote retire le gel.
- Un vote dont la proposition (ou le critère) n'appartient pas à sa consultation est ignoré (votes publics et votes faits dans Grist).
- Page publique : bouton *Voter* sur chaque proposition (sauf en notation), qui ouvre le formulaire avec la proposition déjà choisie (`pre_Proposition`).
- Correction : les colonnes de référence de `Votes_publics` affichent le titre (consultation, proposition) ou le nom (critère) ; le formulaire de vote proposait des numéros.
- Documents existants : *Mettre à jour le contrôle du vote* ajoute `Cloture_vote` et met à jour les formules `Valide`.

## 2026-11-28 (vote public : table séparée, données protégées)
- **Correction de sécurité.** Un formulaire Grist publié peut écrire toutes les colonnes de sa table sans que les règles d'accès s'appliquent (limite de Grist, constatée sur grist.numerique.gouv.fr) : publié sur `Votes`, il permettait de voter au nom de n'importe quelle personne en remplissant `Votant`, même au niveau *Compte Grist*. Les votes du formulaire public vont désormais dans une nouvelle table `Votes_publics`, sans colonne `Votant`, avec ses propres colonnes `Bulletin` et `Valide`. L'outil signale un formulaire encore publié sur `Votes`.
- Les votes faits dans Grist sont reconnus par un numéro (« u: »), jamais par l'adresse du compte, et passent par le même contrôle que les autres (une voix par proposition, plafond de points). Au niveau *Ouvert*, une personne connectée n'est plus comptée comme plusieurs participants. Une adresse de courriel déclarée n'apparaît plus dans `Bulletin`.
- Nouvelles règles d'accès proposées (Réglages › Données, et à l'activation) : codes et adresses de `Votes_publics` lus par les propriétaires seulement ; votes publics modifiés ou retirés par les propriétaires seulement ; liste des votants et colonnes `Votes.Votant`, `Votes.Code`, `Votes.Courriel` illisibles sans compte (documents publics).
- Documents existants : bouton *Mettre à jour le contrôle du vote* (ajoute `Votes_publics` et met à jour les formules ; aucune donnée retirée). Republiez ensuite le formulaire de vote sur `Votes_publics`.
- Aide du lien de vote corrigée : avec grist-questionnaire, le lien se termine par `&pre_Consultation={consultation}` (l'exemple `?consultation=` ne préremplissait rien).

## 2026-11-28 (statut de l'éditeur)
- Barre de l'éditeur : le statut affiche « Non enregistré » (au lieu de « Modifications non enregistrées »), plus court ; la barre ne passe plus sur deux lignes sur un écran étroit.
- Générer les codes de vote ou le code commun agit tout de suite dans le document : cette action ne rend plus les réglages « non enregistrés ».

## 2026-11-28 (liens de vote personnels)
- **Liens de vote personnels** : en *Code individuel*, chaque code a un lien vers le formulaire de vote où le code est déjà rempli (`?pre_Code=…`). Bouton *Copier le lien* pour les 50 premiers codes, liens complets dans le CSV. Le bouton devient *Générer les codes*.
- **Recommandation** affichée avant les niveaux : *Compte Grist* avec le lien réservé pour une consultation interne ; *Code individuel* avec liens personnels pour une consultation ouverte à enjeu. Le niveau *Courriel déclaré* dit clairement que l'adresse n'est jamais vérifiée.
- Correction : après l'enregistrement des réglages, la rubrique Réglages est redessinée (les liens personnels suivent le lien de vote réglé dans Publication).

## 2026-11-27 (accès au document)
- Barre de l'éditeur : le nom du widget et son statut restent sur une ligne ; la barre ne change plus de hauteur quand le statut passe à « non enregistré ».
- Dans Grist, quand le widget ne peut pas lire le document (accès complet non accordé, ou compte sans droit de lecture), un message le dit et indique quoi faire, au lieu d'un outil vide ou d'un écran d'installation. Contrôle commun, dans `commun/barre.js`.

## 2026-11-27 (Réglages › Données)
- Nouvelle rubrique *Réglages › Données* (fichier partagé `commun/donnees.js`) : tables partagées, état des règles d'accès, bouton *Installer les règles proposées*.
- Les règles de `Votes` et `Votants` (déjà documentées) sont posées par l'outil à l'installation des tables ; la règle qui réserve `Codes_vote` aux propriétaires est posée à l'activation du contrôle du vote. Une règle n'est ajoutée que sur une table qui n'en a aucune.
- Correction d'un conseil erroné : masquer `Votes.Bulletin` faisait ignorer les votes par code. Seules `Votes.Code` et `Votes.Courriel` peuvent être masquées.
- Vérifié dans Grist sur une copie de la démo espace-collaboratif : règles reconnues sans doublon, règle `Codes_vote` posée à l'activation, vote par code toujours validé par Grist.

## 2026-11-27 (barre commune de l'éditeur)
- Barre commune à tous les widgets (fichier partagé `commun/barre.js` et `commun/barre.css`) : nom du widget et statut à gauche, onglets Réglages, En-tête et pied, Aperçu, Publication au centre, Enregistrer à droite ; barre collante en haut de l'écran.
- L'outil n'a plus d'onglet à son nom : il s'utilise dans l'Aperçu, ouvert par défaut, avec l'en-tête et le pied de page (affichés une seule fois). Les rubriques propres à l'outil sont des sous-onglets de Réglages quand il y en a plusieurs.
- Liens et boutons « Réglages » ou « Configurer » de l'outil masqués : la barre suffit.
- Même lien, deux affichages : chaque vue Grist choisit, dans Publication, l'éditeur du widget ou la page d'usage (l'outil avec son en-tête et son pied, sans barre, avec un lien « Éditer le widget »). Le choix est une option de la vue Grist ; par défaut, l'éditeur s'affiche comme avant.
- Affichage de la vue : après « Appliquer à cette vue », un texte rappelle de cliquer sur Enregistrer en haut de la vue Grist pour garder le choix (vérifié dans Grist).

## 2026-11-27 (adresse refusée)
- Publication : une adresse de page contenant l'identifiant long du document est refusée avec un message qui explique quoi copier (Grist ignore la page dans ce cas).

## 2026-11-27 (barre stable)
- Barre de réglages : la place du bouton Enregistrer est réservée sur l'onglet de la vue, la barre ne saute plus d'un onglet à l'autre.

## 2026-11-27 (publication réservée)

### Ajouté

- Onglet Publication : section « Lien réservé aux personnes invitées » (collez l'adresse de la page Grist, le lien plein écran se construit, au choix en consultation seule ou avec saisie) et rappel de la différence entre page publique et lien réservé.

## 2026-11-27 (cohérence de la barre de réglages)

### Corrigé

- Le bouton Enregistrer est aligné sur la barre d'onglets, les onglets sont centrés et la pastille « Enregistré / Non enregistré » reste visible sur toutes les pages.

## 2026-11-26 (tables déjà présentes dans le document)

### Corrigé
- Si le document contient déjà une table du même nom que celles de l'outil (`Consultations`, `Propositions`, `Criteres`, `Votes`, `Votants`), créée à la main ou par un autre outil, le widget la croyait prête et n'ajoutait pas les colonnes qui lui manquent : les informations ne s'affichaient pas et les enregistrements échouaient, sans message. Le widget signale maintenant les colonnes manquantes et propose « Ajouter les colonnes manquantes ». L'installation complète aussi les tables déjà présentes. Rien n'est renommé ni supprimé.

### Ajouté
- Conseil affiché : si une de vos colonnes contient déjà l'information sous un autre nom, renommez-la dans Grist avec le nom attendu, ses données seront reprises.

## 2026-11-26 (style commun de configuration)

### Corrigé
- Configuration : sur l'onglet de l'outil, le style commun masquait par erreur tout champ dont l'identifiant finit par « -etat » (dans grist-projet : le filtre « État » de la banque et la liste « État » du formulaire de projet). Seul le badge « Enregistré » de la barre est maintenant masqué. Rien à refaire : rechargez la page.

## 2026-11-26 (vérifications)

### Vérifié
- Dépôt anonyme de bout en bout sur un document installé par le widget : 17 envois sans connexion par un formulaire Grist publié sur la table Votes, tous classés comme attendus par les colonnes `Bulletin` et `Valide`. Documentation mise à jour, aucun changement de code.

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
