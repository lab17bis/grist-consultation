# grist-consultation

> **Widget-outil pour Grist, clé en main.** Il transforme un document Grist en espace de consultation au Système de design de l'État (DSFR) : l'équipe dépose des propositions (idées, réalisations à valoriser, questions, signaux de veille), les soutient ou les départage par un vote, et chacun voit la suite donnée à chaque proposition.

Tout se règle dans Grist, sans toucher au code : en-tête et pied de page, types de propositions, suites possibles, et pour chaque consultation le mode de vote, l'étape, l'échéance et la visibilité des résultats. Le dépôt ne contient que le code : aucune donnée, aucune personne réelle.

## À quoi ça sert

| Besoin | Ce que l'outil permet |
| --- | --- |
| **Boîte à idées** | Dépôt permanent d'idées, soutien par l'équipe, réponse visible sur chaque idée (à l'étude, retenue, en cours, réalisée, non retenue) avec une explication |
| **Valoriser des réalisations** | Un mur de réalisations avec image, description et lien, que l'équipe peut soutenir (« coups de cœur ») |
| **Prioriser** | Vote par points (budget par personne, plafond par proposition) ou choix unique |
| **Comparer des options** | Notation de 1 à 5 sur des critères pondérés, classement par moyenne pondérée et détail par critère |
| **Rendre compte** | Classement, participation, impression ou PDF, copie du résultat pour un courriel |

Chaque **consultation** a :

- un **mode de vote** : *Soutien* (autant de propositions que l'on veut), *Vote par points*, *Choix unique* ou *Notation* ;
- une **étape** : *Dépôt et vote*, *Dépôt seulement*, *Vote seulement* ou *Close*, et une échéance facultative qui la ferme automatiquement ;
- une **visibilité des résultats** : *Toujours*, *Après avoir voté* ou *À la clôture* (pour éviter que les premiers votes influencent les suivants).

Les propositions s'affichent par défaut dans un ordre au hasard, propre à chaque personne, pour ne pas avantager les premières déposées.

Démonstration avec des données fictives (rien n'est enregistré) : <https://lab17bis.github.io/grist-consultation/v1/>

## Le brancher en 3 minutes

1. **Créer un document Grist vide** (ou ouvrir un document existant).
2. **Ajouter le widget** : *Ajouter › Ajouter une page › Personnalisé*, sur n'importe quelle table. Dans le panneau de droite, choisissez *URL personnalisée*, saisissez `https://lab17bis.github.io/grist-consultation/v1/` et donnez l'**accès complet au document**.
3. **Installer** : le widget propose *Créer les tables*, ou *Créer les tables avec un exemple fictif* pour essayer (sans votes). Il crée `Consultations`, `Propositions`, `Criteres`, `Votes` et `Votants` sans toucher aux tables existantes. À faire par un propriétaire du document.

Invitez ensuite l'équipe dans le document (*Partager*) en **éditeur** : il faut pouvoir écrire pour déposer et voter. Une personne en lecture seule voit les propositions et les résultats, sans voter.

Pour recueillir des propositions de personnes qui n'ont pas accès au document, branchez [grist-questionnaire](https://github.com/lab17bis/grist-questionnaire) sur la table `Propositions` : le vote reste réservé aux personnes connectées.

## Le régler

Le widget s'ouvre sur une barre d'onglets : *Consultations* (l'outil), puis *Réglages*, *En-tête et pied*, *Aperçu* (le rendu avec les réglages en cours) et *Publication* (qui peut utiliser l'outil, adresse du widget). Elle regroupe l'en-tête et le pied de page, les types de propositions et les suites possibles. Les réglages sont enregistrés en JSON dans la **description de la colonne `Config_decision`** de la table `Consultations`. Ne supprimez pas cette colonne.

Dans *Réglages*, la section *Champs supplémentaires des propositions* permet d'ajouter ses propres champs au dépôt (texte court ou long, choix dans une liste, date, nombre ; obligatoires ou non). Chaque champ devient une colonne de la table `Propositions`, créée à l'enregistrement des réglages ; il apparaît dans le formulaire de dépôt et sur la fiche de la proposition. Retirer un champ des réglages ne supprime ni la colonne ni ses données, et un champ dont la colonne a été supprimée dans Grist n'est plus proposé.

Chaque consultation se règle dans son onglet *Gérer* : titre, question, présentation, mode de vote, étape, échéance, visibilité des résultats, points par personne, critères de notation et leur poids.

## Modèle de données

| Table | Colonnes |
| --- | --- |
| `Consultations` | `Titre`, `Question`, `Description`, `Mode` (choix), `Phase` (choix), `Echeance` (date), `Resultats` (choix), `Points` et `Max_par_proposition` (entiers, vote par points), `Config_decision` |
| `Propositions` | `Consultation` (référence), `Titre`, `Description`, `Type` (choix), `Auteur`, `Structure`, `Lien`, `Image` (adresse d'une image), `Illustration` (pièce jointe), `Statut` (choix), `Suite` (explication de la suite donnée), `Masquee` (case à cocher), vos champs supplémentaires éventuels (une colonne chacun), `Deposee_par` et `Deposee_le` (remplis par Grist à la création) |
| `Criteres` | `Consultation` (référence), `Nom`, `Description`, `Poids` (nombre) |
| `Votes` | `Consultation`, `Proposition`, `Critere` (références), `Valeur` (nombre), `Votant` et `Vote_le` (remplis par Grist à la création : `user.Email` et `NOW()`) |
| `Votants` | `Email` et `Nom` (remplis par Grist à la création) |

Les modes, étapes et visibilités sont utilisés par le code : ne les renommez pas. Pour retirer une proposition sans la supprimer (doublon, hors sujet), cochez `Masquee`.

## Le reprendre et l'adapter

- **L'utiliser tel quel** : ajoutez le widget dans Grist. Aucune installation n'est nécessaire.
- **L'héberger chez vous** : copiez le dépôt (*Fork*), activez GitHub Pages ou déposez les fichiers sur un serveur web statique, puis changez l'adresse du widget dans Grist. Aucune compilation.
- **Modifier le code** :

| Dossier ou fichier | Rôle |
| --- | --- |
| `v1/` | Version stable figée, servie à l'adresse `…/v1/`. Ne pas modifier à la main. |
| `outils/figer-version.sh` | Copie la version en cours dans `vN/`. |
| `index.html`, `js/app.js`, `css/app.css` | L'application : consultations, propositions, votes, résultats, suites, réglages |
| `commun/` | En-tête et pied de page configurables, communs aux outils `grist-*` |
| `exemples/` | Jeu d'exemple inventé (`demo.json`, dates relatives « J+2 ») et ses illustrations |
| `tests/` | Tests automatisés de l'interface : `python3 tests/test_decision.py` (Playwright), et fonctionnement dans Grist avec une API simulée : `python3 tests/test_dans_grist.py` |
| `vendor/dsfr/` | DSFR, embarqué pour ne dépendre d'aucun service externe |

## Fonctionnement et sécurité

- Le widget lit et écrit dans le document Grist avec les droits de la personne connectée. Il ne contourne aucune règle d'accès : si Grist refuse une écriture, le widget affiche le refus.
- **Qui vote ?** Un widget ne connaît pas la personne connectée. À sa première visite, le widget ajoute une ligne à `Votants` : Grist y inscrit l'adresse et le nom de la personne, et le widget la relit. Chaque vote porte ensuite l'adresse de son auteur, inscrite par Grist (`user.Email`).
- Les votes des collègues sont relus toutes les 30 secondes et à la demande (bouton *Actualiser*).
- Les images déposées depuis le widget sont enregistrées comme pièces jointes du document Grist.

## Limites

- **Une consultation, pas un scrutin.** Les votes ne sont pas anonymes pour les propriétaires du document, qui voient la table `Votes`. Sans règle d'accès, une personne qui a les droits d'édition peut modifier cette table directement dans Grist, y compris écrire un vote au nom d'une autre (voir ci-dessous). Pour une élection, utilisez un outil de vote dédié.
- Dans un document public sans connexion, toutes les personnes anonymes partagent la même identité : sans le vote par code (voir plus bas), le vote n'a pas de sens.
- Une personne qui vote depuis deux navigateurs est reconnue grâce à son adresse ; le plafond de points est vérifié dans le widget, pas par Grist.
- Aucun audit RGAA n'a été mené.

## Vote public contrôlé par code personnel

Pour un vote ouvert au public sans compte Grist, chaque personne autorisée reçoit un **code personnel** et le saisit dans le formulaire de vote. L'outil le vérifie et évite les doublons :

- un **code inconnu** est ignoré, un **vote sans code** aussi ;
- un code ne compte qu'**une fois par proposition** (et par critère en notation) : le premier vote est retenu, les suivants sont ignorés ;
- le **plafond de points** et le maximum par proposition sont vérifiés par Grist, pas seulement par le widget ; en choix unique, seule la première voix compte ;
- un code ne vaut que pour **sa consultation** ;
- le code est saisi sans tenir compte des majuscules, des espaces ni du tiret.

La vérification est faite par Grist (colonnes calculées), donc aussi pour les votes déposés par un formulaire Grist. Le widget ne lit que le résultat de la vérification.

**Mise en place** (par un propriétaire du document) : *Configurer › Réglages › Vote public contrôlé*, bouton *Activer le vote par code*. L'outil ajoute la table `Codes_vote` et, dans `Votes`, les colonnes `Code`, `Bulletin` et `Valide`. Les données existantes ne sont pas modifiées. Ensuite, par consultation : saisir une liste de destinataires (un code par ligne) ou un nombre de codes anonymes, *Créer les codes*, puis *Télécharger la liste (CSV)* pour envoyer chaque code à son destinataire (publipostage). L'outil n'envoie aucun message.

**À faire dans Grist** :
1. Règles d'accès : refuser la lecture de la table `Codes_vote` et de la colonne `Votes.Code` à qui n'est pas propriétaire. Sans cela, un visiteur peut relire les codes et voter à la place d'un autre.
2. Formulaire de vote : un formulaire Grist sur la table `Votes` avec les champs Consultation, Proposition, Valeur et Code. Son adresse se renseigne dans l'onglet Publication.

**Limites** : le code identifie un droit de vote, pas une personne. Qui transmet son code transmet son vote. Le vote reste non anonyme pour les propriétaires du document, qui peuvent relier un code à son destinataire. Une erreur de saisie sur une proposition ne peut pas être corrigée par la personne : le premier vote reste retenu ; un propriétaire peut supprimer la ligne. Les formulaires publics Grist n'ont pas été testés avec ce contrôle : seule la validation des votes par Grist l'a été (doublons, codes inconnus, plafonds, consultations croisées).

## Protéger les votes par des règles d'accès

Recommandé dès que plusieurs personnes votent. Dans Grist : **Règles d'accès** (panneau de gauche), **Ajouter des règles de table**, puis :

| Table | Condition | Permissions | Effet |
|---|---|---|---|
| `Votes` | `user.Access != OWNER and newRec.Votant != user.Email` | Refuser *Créer* et *Modifier* | Un vote est toujours enregistré au nom de la personne connectée. |
| `Votes` | `user.Access != OWNER and rec.Votant != user.Email` | Refuser *Modifier* et *Supprimer* | On ne modifie ni ne retire le vote d'une autre personne. |
| `Votants` | `user.Access != OWNER and newRec.Email != user.Email` | Refuser *Créer* et *Modifier* | Chaque personne ne s'inscrit qu'à son nom. |
| `Votants` | `user.Access != OWNER and rec.Email != user.Email` | Refuser *Modifier* et *Supprimer* | On ne modifie pas l'inscription d'une autre personne. |

Les propriétaires du document gardent tous les droits (pour corriger ou nettoyer). Ces règles ont été vérifiées sur une instance Grist réelle : le widget fonctionne normalement, et un vote au nom d'une autre personne est refusé par Grist. Pour masquer en plus les votes individuels, ajoutez une règle de lecture sur la table `Votes`.

## Version stable et version en cours

Dans Grist, utilisez l'adresse de la **version stable** : `https://lab17bis.github.io/grist-consultation/v1/`. Elle ne change que pour corriger un défaut, sans toucher aux tables ni aux réglages. Une évolution qui les modifie paraît sous une nouvelle adresse (`v2/`) : les documents déjà en service restent sur `v1/` tant que vous ne changez pas l'adresse du widget.

L'adresse sans numéro (`https://lab17bis.github.io/grist-consultation/`) suit la version en cours de développement. Elle sert à essayer les nouveautés ; ne l'utilisez pas pour un document en service.

Pour figer une nouvelle version stable après des tests réussis : `sh outils/figer-version.sh 1` (ou `2` pour une version qui change les tables), puis publiez le dépôt.

## Données partagées avec les autres outils

Plusieurs outils de la même famille peuvent travailler dans un même document Grist. Ils suivent une règle commune pour ne pas dupliquer les données :

- **Une seule table `Personnes`** par document. Colonne commune : `Nom`. Colonnes facultatives reconnues par tous : `Email` et `Structure` (référence à `Structures`). Un outil lit cette table si elle existe et la crée seulement si elle manque. Il n'y ajoute que ses propres colonnes.
- **Une seule table `Structures`** pour les équipes, services ou établissements : `Nom`, `Sigle`, `Type`, `Parent` (structure de rattachement).
- **Aucun outil ne supprime ni ne renomme** une table ou une colonne qu'il n'a pas créée.
- **Les autres tables portent des noms propres à chaque outil**, pour éviter les collisions (par exemple `Actions` pour grist-projet, `Actions_reunion` pour grist-consultation). Les réglages sont rangés dans la description d'une colonne technique propre à l'outil (`Config_…`).
- **Identifier la personne connectée** : un widget ne connaît pas l'adresse de la personne connectée. Les colonnes « créé par » utilisent une formule `user.Email` calculée à la création. Seul un outil qui doit relier la personne connectée à sa fiche crée la table `Comptes`.

Ce que fait cet outil : il ne crée ni ne lit de table de personnes. Pour savoir qui vote, il utilise sa propre table `Votants` (adresse et nom remplis par Grist, une ligne par personne venue voter) : elle n'est pas reliée à `Personnes`.

## Espaces clés en main

Ce widget est assemblé, avec d'autres, dans des **espaces** : des documents Grist prêts à l'emploi.

- [espace-contributions](https://github.com/lab17bis/espace-contributions) : boîte à idées, valorisation des réalisations des équipes, votes et suites données (page *Consultations*).
- [espace-pilotage](https://github.com/lab17bis/espace-pilotage) : l'équipe classe les chantiers du semestre par un vote par points (page *Priorités*).
- [espace-collaboratif](https://github.com/lab17bis/espace-collaboratif) : boîte à idées de l'équipe et choix collectifs (page *Décider ensemble*).

## Autres outils de la même famille

- [grist-questionnaire](https://github.com/lab17bis/grist-questionnaire) : questionnaires au DSFR avec logique conditionnelle.
- [grist-catalogue](https://github.com/lab17bis/grist-catalogue) : catalogue public de fiches au DSFR.
- [grist-graphique](https://github.com/lab17bis/grist-graphique) : tableaux de bord et graphiques au DSFR.
- [grist-projet](https://github.com/lab17bis/grist-projet) : espace d'équipe pour gérer des projets.
- [grist-reunion](https://github.com/lab17bis/grist-reunion) : réunions : ordre du jour, séance, compte rendu et suivi des actions.
- [grist-annuaire](https://github.com/lab17bis/grist-annuaire) : annuaire des personnes et des structures d'un document : recherche, fiches, doublons, import, protection des données.
- [grist-management](https://github.com/lab17bis/grist-management) : écran de management visuel d'équipe.
- [grist-carte](https://github.com/lab17bis/grist-carte) : carte interactive des lignes d'une table, au fond de l'IGN.
- [grist-graphe](https://github.com/lab17bis/grist-graphe) : cartographie des acteurs et de leurs liens.

Les widgets qui ont un en-tête et un pied de page partagent les mêmes réglages.

## Écosystème

- **[Grist](https://grist.numerique.gouv.fr)** : tableur-base de données libre ([gristlabs/grist-core](https://github.com/gristlabs/grist-core)), proposé aux agents publics par la [DINUM](https://www.numerique.gouv.fr/) dans [La Suite numérique](https://lasuite.numerique.gouv.fr/).
- **[Système de design de l'État (DSFR)](https://www.systeme-de-design.gouv.fr/)** ([GouvernementFR/dsfr](https://github.com/GouvernementFR/dsfr)). Son usage est réservé aux sites des services de l'État.
- **[Communauté Grist francophone](https://forum.grist.libre.sh/)**.

## Mots-clés

Grist, widget Grist, widget-outil, consultation, boîte à idées, budget participatif, vote, vote par points, choix unique, notation multicritère, priorisation, aide à la décision, valorisation, réalisations, innovation participative, DSFR, Système de design de l'État, La Suite numérique, DINUM, service public, clé en main, logiciel libre.

## Page publique

Paramètres de l'adresse : `public=1&doc=<lien>&table=Consultations`. La table `Votants` n'est jamais lue et les votants des votes sont remplacés par un numéro. Voter et déposer une proposition se font par un lien de questionnaire, à indiquer dans l'onglet Publication (champ « lien de vote »). Si une table lisible manque, la page l'indique au lieu de proposer l'installation de l'outil.

L'onglet **Publication** construit le lien d'une page publique : collez le lien du document Grist partagé en lecture publique (*Partager › Accès public : Lecteur*), puis copiez ou ouvrez le lien obtenu. La page est en lecture seule, sans compte, et n'écrit jamais dans le document. L'option `integre=1` retire l'en-tête et le pied de page pour intégrer la page dans un autre site ou dans le [portail](https://github.com/lab17bis/grist-portail).

Le partage en lecture publique rend lisibles **toutes** les tables du document, pas seulement celles que la page affiche. Pour masquer une table ou une colonne au public, utilisez les règles d'accès de Grist, par exemple avec la condition `not user.IsLoggedIn` (lecture refusée). La page tolère une table masquée. Testez en navigation privée avant de diffuser le lien.

## Licence

Code sous licence MIT (voir `LICENSE`). Le DSFR embarqué dans `vendor/dsfr/` conserve sa propre licence. Réutilisation, adaptation et contributions bienvenues.

Conçu par le Lab 17 bis, laboratoire d'innovation publique de l'académie de Reims. Contact : <lab17bis@ac-reims.fr>

Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims.
