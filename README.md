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

La barre de l'éditeur est commune à tous les widgets : nom du widget et statut d'enregistrement à gauche, onglets *Réglages*, *En-tête et pied*, *Aperçu* et *Publication* au centre, bouton *Enregistrer* à droite. L'outil s'utilise dans l'onglet *Aperçu*, ouvert par défaut, avec son en-tête et son pied de page. *Réglages* regroupe l'en-tête et le pied de page, les types de propositions et les suites possibles. Les réglages sont enregistrés en JSON dans la **description de la colonne `Config_decision`** de la table `Consultations`. Ne supprimez pas cette colonne.

**Éditeur du widget ou page d'usage, avec le même lien.** Chaque vue Grist choisit ce qu'elle affiche (onglet *Publication*, rubrique *Affichage de cette vue Grist*) : l'**éditeur du widget** (affichage par défaut) ou la **page d'usage** (l'outil avec son en-tête et son pied de page, sans barre de réglages ; un lien *Éditer le widget*, en bas de page, rouvre l'éditeur). Après *Appliquer à cette vue*, cliquez sur *Enregistrer* en haut à droite de la vue Grist pour garder le choix. Pour avoir les deux dans un document, ajoutez deux vues Personnalisées avec la même adresse. Ce choix n'est pas une protection : les droits restent ceux du document (Partager, Permissions avancées).

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

## Deux façons de voter

| | Vote identifié | Vote public par code |
|---|---|---|
| Pour qui | Personnes avec un compte, invitées en éditeur | Personnes sans compte Grist |
| Où | Dans le widget, dans l'interface Grist | Dans une page de vote publique (grist-questionnaire) |
| Qui est reconnu | L'adresse de la personne, inscrite par Grist | Un code personnel (droit de vote, pas une personne) |
| Doublons | Évités par les règles d'accès recommandées | Évités par les colonnes calculées de Grist |

La page publique du widget ne permet pas de voter : elle est en lecture seule. Pour envoyer une personne voter directement dans Grist, sans les menus du document, ajoutez `?style=light` à l'adresse de la page du widget.

## Identifier les votes sur la page publique

**Recommandé** : pour une consultation interne, le niveau *Compte Grist* avec le lien réservé (une personne, un compte, un vote ; ni code ni courriel). Pour une consultation ouverte avec un enjeu, le *Code individuel* avec les liens de vote personnels. Sans compte ni code, aucun niveau ne garantit un vote par personne : Grist ne vérifie pas d'identité et n'envoie pas de courriel.

Sur une page publique, Grist ne sait pas qui vote. Le niveau d'identification se choisit **consultation par consultation** (*Réglages › Identification des votes sur la page publique*, colonne `Consultations.Identification`). Un vote non reconnu est ignoré. Les cinq niveaux, du plus ouvert au plus strict :

| Niveau | Ce que la personne fait | Pour quel usage | Limite |
| --- | --- | --- | --- |
| **Ouvert** | Rien | Sondage d'opinion sans enjeu | Doublons et envois automatiques possibles ; quotas valables par envoi seulement |
| **Courriel déclaré** | Saisit son adresse ; un vote retenu par adresse | Décourager les doublons maladroits sans fabriquer de codes | Adresse jamais vérifiée (Grist n'envoie pas de courriel) : on peut en inventer ou emprunter celle d'une autre personne ; décourage les doublons, sans plus |
| **Code commun** | Saisit le code donné à tout le groupe | Réserver le vote à un groupe fermé sans liste nominative | Le code filtre qui vote, pas combien de fois ; un code qui circule ouvre le vote |
| **Code individuel** | Clique sur son lien de vote personnel (code déjà rempli) ou saisit son code, à usage unique par proposition | Vote nominatif ou à enjeu | Distribuer les liens ; un lien transmis à une autre personne lui donne ce vote |
| **Compte Grist** | Se connecte à Grist | Garantie la plus élevée : l'identité est celle du compte | Compte et accès au document nécessaires ; ce n'est plus une page publique |

**Deux tables de votes.** Les votes faits dans Grist, au nom du compte, vont dans `Votes`, protégée par les règles d'accès. Les votes du formulaire public vont dans `Votes_publics`. Il le faut : un formulaire Grist publié peut écrire **toutes** les colonnes de sa table, sans que les règles d'accès s'appliquent (limite de Grist). Publié sur `Votes`, il permettrait de voter au nom de n'importe qui, en remplissant la colonne `Votant`. `Votes_publics` n'a pas de colonne `Votant`. L'outil signale un formulaire publié sur `Votes`.

Ce que Grist contrôle dans tous les cas (colonnes calculées `Bulletin` et `Valide` des deux tables) :

- un votant ne compte qu'**une fois par proposition** (et par critère en notation) : le premier vote est retenu, les suivants sont ignorés ;
- le **plafond de points** et le maximum par proposition ; en choix unique, seule la première voix compte ;
- un code ne vaut que pour **sa consultation**, et la proposition (comme le critère) doit appartenir à la consultation du vote ;
- **échéance** : un vote public reçu après le jour d'échéance de la consultation est ignoré. Quand le vote d'une consultation se ferme (échéance passée, phase changée), l'outil note le numéro du dernier vote public reçu (colonne `Consultations.Cloture_vote`) : tout vote public plus récent est ignoré, même si sa date d'envoi a été falsifiée. Rouvrir le vote retire ce gel. Le gel est noté à la première ouverture de l'outil après la fermeture, par une personne qui peut modifier les consultations ; entre la fermeture et ce moment, seule la date d'envoi fait foi ;
- le code est saisi sans tenir compte des majuscules, des espaces ni du tiret ; l'adresse, sans tenir compte des majuscules ;
- un vote fait dans Grist est reconnu par un numéro (« u: » suivi du numéro du premier vote de ce compte), jamais par l'adresse du compte : la page publique compte les votes sans lire les adresses.

Aux niveaux **Ouvert** et **Code commun**, chaque envoi est un votant : on ne peut pas limiter le nombre de voix par personne, seulement par envoi.

**Mise en place** (par un propriétaire du document) : bouton *Activer le contrôle du vote* (ou *Mettre à jour le contrôle du vote* pour un document installé avant les niveaux). L'outil ajoute la table `Codes_vote`, la table `Votes_publics` (votes du formulaire public), la colonne `Identification` dans `Consultations` et, dans `Votes`, les colonnes `Code`, `Courriel`, `Bulletin` et `Valide`. Les données existantes ne sont pas modifiées. Ensuite, par consultation : choisir le niveau ; en *Code commun*, créer le code ; en *Code individuel*, saisir une liste de destinataires (un code par ligne) ou un nombre de codes anonymes, puis *Générer les codes*. Chaque code a un **lien de vote personnel** : le lien du formulaire de vote (onglet *Publication*) avec le code déjà rempli (`?pre_Code=…`, lu par grist-questionnaire) ; la personne clique, elle ne tape rien. Les 50 premiers codes s'affichent avec un bouton *Copier le lien* ; *Télécharger la liste (CSV)* donne tous les codes et leurs liens, pour envoyer à chacun le sien. L'outil n'envoie aucun message.

**À faire dans Grist** :
1. Règles d'accès : à l'activation, l'outil réserve la table `Codes_vote` aux propriétaires, réserve aux propriétaires les codes et adresses saisis dans `Votes_publics` (lecture) et ses votes (modification, retrait), et cache aux visiteurs sans compte la liste des votants et les colonnes `Votes.Votant`, `Votes.Code` et `Votes.Courriel` (voir *Protéger les votes par des règles d'accès*). Ne masquez jamais les colonnes `Bulletin` ni `Valide` : l'outil en a besoin pour compter les votes. Testez un vote en navigation privée.
2. Page de vote : un [grist-questionnaire](https://github.com/lab17bis/grist-questionnaire) branché sur la table `Votes_publics` (jamais `Votes`), avec les questions Consultation, Proposition, Valeur, et Code ou Courriel selon le niveau. L'adresse publique du questionnaire se renseigne dans l'onglet Publication (champ « lien de vote »), suivie de `&pre_Consultation={consultation}` : la consultation est déjà choisie quand la personne arrive par le bouton *Voter* ou par son lien personnel. Sur la page publique, chaque proposition a son bouton *Voter*, qui ajoute `&pre_Proposition=` : la personne n'a pas à chercher dans la liste de toutes les propositions. Réglage conseillé dans le questionnaire : question Consultation *masquée* et question Proposition *affichée, non modifiable* quand elles sont préremplies (réglage « Si la réponse est préremplie par l'adresse »). En notation, une réponse ne porte qu'une note pour un critère : le vote public en notation demande une réponse par critère, il convient mal à un formulaire. Les personnes ne voient que la page au design de l'État, jamais l'interface native de Grist.
3. Assemblage : le [portail](https://github.com/lab17bis/grist-portail) affiche, sous une seule adresse, une page pour la consultation (la page publique de cet outil) et une page pour le vote (le questionnaire).

**Limites** : un code identifie un droit de vote, pas une personne : qui le transmet transmet son vote. Le vote reste non anonyme pour les propriétaires du document, qui peuvent relier un code ou une adresse à son votant. Une erreur de saisie ne peut pas être corrigée par la personne : le premier vote reste retenu ; un propriétaire peut supprimer la ligne. En vote par points, un dépassement du budget invalide aussi les votes suivants du même votant. Testé de bout en bout sur grist.numerique.gouv.fr (28/11/2026), document public avec les règles posées par l'outil : vote par le questionnaire DSFR ouvert par un lien personnel (consultation et code déjà remplis) ; envois sans connexion, depuis une page d'un autre domaine, sur `Votes_publics`, aux niveaux Ouvert, Courriel déclaré, Code commun et Code individuel, chacun classé comme attendu (doublon, code inconnu ou absent, code commun en minuscules avec tiret, adresse invalide, budget de points dépassé). Un envoi avec une colonne `Votant` est refusé par Grist ; écrire dans `Votes` par le lien du formulaire est refusé ; sans compte, `Codes_vote` est illisible, `Votes.Votant`, les codes, les courriels et la liste des votants sont masqués, et la page publique compte les votes par leur numéro. Avant cette version, un vote envoyé au nom d'une personne réelle par un formulaire publié sur `Votes` était compté : c'est ce test qui a conduit à la table `Votes_publics`. Non testé : le vote en notation par le formulaire (il faut une question Critère, une réponse par critère).

## Protéger les votes par des règles d'accès

Recommandé dès que plusieurs personnes votent. L'outil les pose lui-même, à l'installation des tables, à l'activation du contrôle du vote, ou par le bouton *Installer les règles proposées* de **Réglages › Données** (réservé aux propriétaires). Une règle n'est ajoutée que sur une table qui n'en a aucune : les règles existantes ne sont jamais modifiées. Pour les poser à la main : **Règles d'accès** (panneau de gauche), **Ajouter des règles de table**, puis :

| Table | Condition | Permissions | Effet |
|---|---|---|---|
| `Votes` | `user.Access != OWNER and newRec.Votant != user.Email` | Refuser *Créer* et *Modifier* | Un vote est toujours enregistré au nom de la personne connectée. |
| `Votes` | `user.Access != OWNER and rec.Votant != user.Email` | Refuser *Modifier* et *Supprimer* | On ne modifie ni ne retire le vote d'une autre personne. |
| `Votants` | `user.Access != OWNER and newRec.Email != user.Email` | Refuser *Créer* et *Modifier* | Chaque personne ne s'inscrit qu'à son nom. |
| `Votants` | `user.Access != OWNER and rec.Email != user.Email` | Refuser *Modifier* et *Supprimer* | On ne modifie pas l'inscription d'une autre personne. |
| `Codes_vote` | `user.Access != OWNER` | Refuser *Créer*, *Lire*, *Modifier* et *Supprimer* | Les codes ne sont lus et créés que par les propriétaires. Le contrôle des votes par Grist continue de fonctionner (vérifié). |
| `Votes_publics`, colonnes `Code`, `Courriel` | `user.Access != OWNER` | Refuser *Lire* | Les codes et adresses saisis dans le formulaire de vote ne sont lus que par les propriétaires. |
| `Votes_publics` | `user.Access != OWNER` | Refuser *Modifier* et *Supprimer* | Les votes du formulaire public ne sont modifiés ou retirés que par les propriétaires. |
| `Votants`, colonnes `Email`, `Nom` | `not user.IsLoggedIn` | Refuser *Lire* | Les noms et adresses des votants ne sont pas lisibles sans compte (document public). |
| `Votes`, colonnes `Votant`, `Code`, `Courriel` | `not user.IsLoggedIn` | Refuser *Lire* | L'adresse des votants, les codes et les courriels ne sont pas lisibles sans compte. Proposée une fois le contrôle du vote à jour : la page publique compte alors les votes par leur numéro. |

Les propriétaires du document gardent tous les droits (pour corriger ou nettoyer). Conséquence : supprimer un critère qui a déjà reçu des votes devient réservé aux propriétaires. Ces règles ont été vérifiées sur une instance Grist réelle : le widget fonctionne normalement, et un vote au nom d'une autre personne est refusé par Grist. **Ces règles ne s'appliquent pas aux envois d'un formulaire Grist publié** : Grist autorise un formulaire publié à écrire toutes les colonnes de sa table. D'où la table `Votes_publics`, sans colonne `Votant`, pour le formulaire public. Pour masquer en plus les votes individuels, ajoutez une règle de lecture sur la table `Votes`.

## Version stable et version en cours

Dans Grist, utilisez l'adresse de la **version stable** : `https://lab17bis.github.io/grist-consultation/v1/`. Elle ne change que pour corriger un défaut, sans toucher aux tables ni aux réglages. Une évolution qui les modifie paraît sous une nouvelle adresse (`v2/`) : les documents déjà en service restent sur `v1/` tant que vous ne changez pas l'adresse du widget.

L'adresse sans numéro (`https://lab17bis.github.io/grist-consultation/`) suit la version en cours de développement. Elle sert à essayer les nouveautés ; ne l'utilisez pas pour un document en service.

Pour figer une nouvelle version stable après des tests réussis : `sh outils/figer-version.sh 1` (ou `2` pour une version qui change les tables), puis publiez le dépôt.

## Données partagées avec les autres outils

Plusieurs outils de la même famille peuvent travailler dans un même document Grist. Ils suivent une règle commune pour ne pas dupliquer les données :

- **Une seule table `Personnes`** par document. Colonne commune : `Nom`. Colonnes facultatives reconnues par tous : `Email` et `Structure` (référence à `Structures`). Un outil lit cette table si elle existe et la crée seulement si elle manque. Il n'y ajoute que ses propres colonnes.
- **Une seule table `Structures`** pour les équipes, services ou établissements : `Nom`, `Sigle`, `Type`, `Parent` (structure de rattachement).
- **Aucun outil ne supprime ni ne renomme** une table ou une colonne qu'il n'a pas créée.
- **Les autres tables portent des noms propres à chaque outil**, pour éviter les collisions (par exemple `Actions` pour grist-projet, `Actions_reunion` pour grist-reunion). Les réglages sont rangés dans la description d'une colonne technique propre à l'outil (`Config_…`).
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

Paramètres de l'adresse : `public=1&doc=<lien>&table=Consultations`. La table `Votants` n'est jamais lue et les votants des votes sont remplacés par un numéro. Voter et déposer une proposition se font par un questionnaire (grist-questionnaire), à indiquer dans l'onglet Publication (champ « lien de vote »). Si une table lisible manque, la page l'indique au lieu de proposer l'installation de l'outil.

L'onglet **Publication** construit le lien d'une page publique : collez le lien du document Grist partagé en lecture publique (*Partager › Accès public : Lecteur*), puis copiez ou ouvrez le lien obtenu. La page est en lecture seule, sans compte, et n'écrit jamais dans le document. L'option `integre=1` retire l'en-tête et le pied de page pour intégrer la page dans un autre site ou dans le [portail](https://github.com/lab17bis/grist-portail).

Ce que la page publique montre : les consultations, les propositions non masquées (la case `Masquee` les retire) avec leur statut et leur suite, et les résultats selon le réglage de chaque consultation. Avec *Après avoir voté*, les résultats n'apparaissent qu'à la clôture, car la page ne sait pas qui a voté. Elle ne montre ni la table `Votants`, ni les codes ; chaque votant y devient un numéro.

Le partage en lecture publique rend lisibles **toutes** les tables du document, pas seulement celles que la page affiche. Pour masquer une table ou une colonne au public, utilisez les règles d'accès de Grist, par exemple avec la condition `not user.IsLoggedIn` (lecture refusée). La page tolère une table masquée. Testez en navigation privée avant de diffuser le lien.

## Licence

Code sous licence MIT (voir `LICENSE`). Le DSFR embarqué dans `vendor/dsfr/` conserve sa propre licence. Réutilisation, adaptation et contributions bienvenues.

Conçu par le Lab 17 bis, laboratoire d'innovation publique de l'académie de Reims. Contact : <lab17bis@ac-reims.fr>

Widget conçu par le Lab 17 bis, le laboratoire d'innovation publique de l'académie de Reims.
