/*
 * grist-consultation – recueillir des propositions, les mettre au vote et décider des suites,
 * widget-outil Grist au DSFR.
 *
 * Une consultation regroupe des propositions (idées, réalisations à valoriser, questions…).
 * Selon son mode, chaque personne connectée les soutient, répartit des points, fait un choix
 * unique ou les note selon des critères pondérés. Les résultats et les suites données
 * (retenue, en cours, réalisée…) sont visibles par toute l'équipe.
 *
 * Le widget lit et écrit dans le document Grist avec les droits de la personne connectée.
 * Hors de Grist (page ouverte directement), il charge des données fictives et simule les
 * écritures en mémoire.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Référentiels
  // ---------------------------------------------------------------------------

  var DEFAUTS = {
    types: ['Idée', 'Réalisation à valoriser', 'Question', 'Signal de veille'],
    statuts: ['Déposée', 'À l\'étude', 'Retenue', 'En cours', 'Réalisée', 'Non retenue']
  };
  var MODES = ['Soutien', 'Vote par points', 'Choix unique', 'Notation'];
  var AIDE_MODE = {
    'Soutien': 'Soutenez autant de propositions que vous le souhaitez.',
    'Vote par points': 'Répartissez vos points entre les propositions qui comptent le plus pour vous.',
    'Choix unique': 'Choisissez une seule proposition. Vous pouvez changer d\'avis tant que le vote est ouvert.',
    'Notation': 'Notez chaque proposition de 1 à 5 sur chaque critère. Le classement tient compte du poids des critères.'
  };
  var PHASES = ['Dépôt et vote', 'Dépôt seulement', 'Vote seulement', 'Close'];
  var VISIBILITES = ['Toujours', 'Après avoir voté', 'À la clôture'];
  var COULEURS_TYPE = ['purple-glycine', 'green-menthe', 'blue-ecume', 'orange-terre-battue', 'yellow-tournesol', 'pink-macaron', 'green-bourgeon', 'brown-caramel'];
  var COULEUR_STATUT = { 'À l\'étude': 'info', 'Retenue': 'success', 'En cours': 'new', 'Réalisée': 'success', 'Non retenue': 'warning' };

  var NOM_COLONNE_CONFIG = 'Config_consultation';
  var ANCIEN_NOM_COLONNE_CONFIG = 'Config_decision';   // documents créés avant le renommage : lu et conservé
  var TABLES = ['Consultations', 'Propositions', 'Criteres', 'Votes', 'Votants'];
  var L = {};
  var reglages = {};

  function appliquerReglages(r) {
    reglages = r || {};
    var l = reglages.listes || {};
    Object.keys(DEFAUTS).forEach(function (k) { L[k] = Array.isArray(l[k]) && l[k].length ? l[k] : DEFAUTS[k]; });
    var page = Object.assign({ marque: '', titre: 'Consultations', pied: { accessibilite: '' } }, reglages.page || {});
    if (window.PageDSFR) {
      var cible = window.PageDSFR.appliquer(page, { entete: document.getElementById('entete'), pied: document.getElementById('pied'), accueil: '#/' });
      cible.entete.id = 'entete';
      cible.pied.id = 'pied';
    }
  }

  // ---------------------------------------------------------------------------
  // État
  // ---------------------------------------------------------------------------

  var PUBLIC = !!(window.GristPublic && window.GristPublic.actif);
  var DEMO = window.self === window.top && !PUBLIC;
  var meta = { colonnes: [], tables: [], colConfig: false };
  var data = {}, idx = {};
  var moi = null;            // { email, nom } : personne connectée, connue après identification
  var lectureSeule = PUBLIC;  // vrai si la personne ne peut pas écrire dans le document
  var etat = { alerte: null, brouillons: {}, filtres: {}, suppression: null, rendreApresSaisie: false, garderAlerte: false };
  var jeton = null;          // accès aux pièces jointes de Grist (images)
  var app = document.getElementById('gd-app');

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------

  function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  function nombre(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function texteMultiligne(t) { return esc(t).replace(/\n/g, '<br>'); }
  function dateTexte(sec) { return sec ? new Date(sec * 1000).toLocaleDateString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }) : ''; }
  function dateVersSaisie(sec) { return sec ? new Date(sec * 1000).toISOString().slice(0, 10) : ''; }
  function saisieVersDate(txt) { var p = String(txt || '').split('-'); return p.length === 3 ? Date.UTC(+p[0], +p[1] - 1, +p[2]) / 1000 : null; }
  function aujourdhui() { var d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 1000; }
  function pluriel(n, s, p) { return n + ' ' + (n > 1 ? (p || s + 's') : s); }
  function arrondi(v, d) { var f = Math.pow(10, d || 0); return Math.round(v * f) / f; }
  function badge(texte, couleur) {
    if (!texte) return '';
    return '<span class="fr-badge fr-badge--sm fr-badge--no-icon' + (couleur ? ' fr-badge--' + couleur : '') + '">' + esc(texte) + '</span>';
  }
  function badgeType(t) { var i = L.types.indexOf(t); return badge(t, COULEURS_TYPE[(i < 0 ? 0 : i) % COULEURS_TYPE.length]); }
  function badgeStatut(s) { return s && s !== L.statuts[0] ? badge(s, COULEUR_STATUT[s] || '') : ''; }
  function lignesDepuisColonnes(cols) {
    var ids = cols.id || [], cles = Object.keys(cols), res = [];
    for (var i = 0; i < ids.length; i++) { var l = {}; cles.forEach(function (k) { l[k] = cols[k][i]; }); res.push(l); }
    return res;
  }
  function brouillon(cle) { return (etat.brouillons[cle] = etat.brouillons[cle] || {}); }
  function adresse(u) { return window.PageDSFR ? window.PageDSFR.adresseSure(u) : ''; }
  // Ordre « au hasard » stable pour une personne : évite que les premières propositions soient favorisées.
  function hachage(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------------------------------------------------------------------------
  // Données
  // ---------------------------------------------------------------------------

  function chargerDemo() {
    appliquerReglages({ page: { titre: 'Consultations', sousTitre: 'Démonstration' } });
    return fetch('exemples/demo.json').then(function (r) { return r.json(); }).then(function (json) {
      var auj = aujourdhui();
      TABLES.forEach(function (t) {
        data[t] = (json[t] || []).map(function (l) {
          var c = Object.assign({}, l);
          ['Echeance', 'Deposee_le', 'Vote_le'].forEach(function (k) {
            if (typeof c[k] === 'string') { var m = c[k].match(/^J([+-]\d+)$/); c[k] = m ? auj + 86400 * (+m[1]) : saisieVersDate(c[k]); }
          });
          return c;
        });
      });
      moi = { email: 'vous@exemple.fr', nom: 'Vous (démonstration)' };
    });
  }

  function chargerGrist() {
    var config = Promise.all([grist.docApi.fetchTable('_grist_Tables'), grist.docApi.fetchTable('_grist_Tables_column')])
      .then(function (m) {
        var tables = lignesDepuisColonnes(m[0]), cols = lignesDepuisColonnes(m[1]);
        meta.tables = tables; meta.colonnes = cols;
        var t = tables.filter(function (x) { return x.tableId === 'Consultations'; })[0];
        var c = t && cols.filter(function (x) { return x.parentId === t.id && (x.colId === NOM_COLONNE_CONFIG || x.colId === ANCIEN_NOM_COLONNE_CONFIG); })[0];
        meta.colConfig = !!c; meta.nomColConfig = c ? c.colId : NOM_COLONNE_CONFIG;
        var r = {};
        try { r = c && c.description ? JSON.parse(c.description) : {}; } catch (e) { r = {}; }
        appliquerReglages(r);
      }).catch(function () { appliquerReglages({}); });
    return Promise.all([config].concat(TABLES.map(function (t) {
      // Page publique : la table des votants (adresses de courriel) n'est jamais lue, et les votants des votes sont remplacés par un numéro.
      if (PUBLIC && t === 'Votants') { data[t] = []; return Promise.resolve(); }
      return grist.docApi.fetchTable(t).then(function (c) {
        data[t] = lignesDepuisColonnes(c);
        if (PUBLIC && t === 'Votes') {
          var noms = {}, n = 0;
          data[t].forEach(function (v) { if (v.Votant) { if (!noms[v.Votant]) noms[v.Votant] = 'v' + (++n); v.Votant = noms[v.Votant]; } });
        }
      }).catch(function () { data[t] = []; });
    })));
  }

  function charger() { return (DEMO ? chargerDemo() : chargerGrist()).then(indexer); }
  function indexer() {
    idx = {};
    TABLES.forEach(function (t) { idx[t] = {}; (data[t] || []).forEach(function (l) { idx[t][l.id] = l; }); });
  }

  // Identification : la personne ajoute une ligne à Votants, dont les colonnes Email et Nom sont
  // remplies par Grist (formules déclenchées à la création). Le widget relit la ligne pour savoir
  // qui est connecté, puis retire la ligne si la personne était déjà connue.
  var cleMoi = null;
  function identifier() {
    if (DEMO || PUBLIC || moi) return Promise.resolve();
    return grist.docApi.getDocName().catch(function () { return 'doc'; }).then(function (nomDoc) {
      cleMoi = 'gd-moi-' + nomDoc;
      var connu = null;
      try { connu = JSON.parse(localStorage.getItem(cleMoi) || 'null'); } catch (e) { connu = null; }
      if (connu && data.Votants.some(function (v) { return v.Email === connu.email; })) { moi = connu; return null; }
      return grist.docApi.applyUserActions([['AddRecord', 'Votants', null, {}]]).then(function (res) {
        var id = res.retValues[0];
        return grist.docApi.fetchTable('Votants').then(function (c) {
          var lignes = lignesDepuisColonnes(c), l = lignes.filter(function (x) { return x.id === id; })[0];
          if (!l || !l.Email) throw new Error('identification impossible');
          moi = { email: l.Email, nom: l.Nom || l.Email };
          try { localStorage.setItem(cleMoi, JSON.stringify(moi)); } catch (e) { /* stockage indisponible */ }
          var doublon = lignes.some(function (x) { return x.Email === l.Email && x.id !== id; });
          return doublon ? grist.docApi.applyUserActions([['RemoveRecord', 'Votants', id]]) : null;
        });
      }).then(function () { return charger(); });
    }).catch(function () { lectureSeule = true; });
  }

  function consultation(id) { return (idx.Consultations || {})[id]; }
  function propositionsDe(cid, toutes) {
    return data.Propositions.filter(function (p) { return num(p.Consultation) === cid && (toutes || !p.Masquee); });
  }
  function criteresDe(cid) { return data.Criteres.filter(function (c) { return num(c.Consultation) === cid; }).sort(function (a, b) { return a.id - b.id; }); }
  function votesDe(cid) { return data.Votes.filter(function (v) { return num(v.Consultation) === cid && idx.Propositions[num(v.Proposition)]; }); }
  function mesVotes(cid) { return moi ? votesDe(cid).filter(function (v) { return v.Votant === moi.email; }) : []; }
  function monVote(cid, pid, crit) {
    return mesVotes(cid).filter(function (v) { return num(v.Proposition) === pid && (crit === undefined || num(v.Critere) === crit); })[0];
  }
  function budget(c) { return num(c.Points) > 0 ? num(c.Points) : 5; }
  function maxParProposition(c) { return num(c.Max_par_proposition) > 0 ? num(c.Max_par_proposition) : budget(c); }
  function pointsUtilises(c) { return mesVotes(c.id).reduce(function (s, v) { return s + nombre(v.Valeur); }, 0); }
  function participants(cid) { var s = {}; votesDe(cid).forEach(function (v) { if (v.Votant) s[v.Votant] = 1; }); return Object.keys(s).length; }

  function echue(c) { return c.Echeance && c.Echeance < aujourdhui(); }
  function voteOuvert(c) { return !echue(c) && (c.Phase === 'Dépôt et vote' || c.Phase === 'Vote seulement'); }
  function depotOuvert(c) { return !echue(c) && (c.Phase === 'Dépôt et vote' || c.Phase === 'Dépôt seulement'); }
  function close(c) { return c.Phase === 'Close' || echue(c); }
  function aVote(c) { return mesVotes(c.id).length > 0; }
  function resultatsVisibles(c) {
    if (close(c)) return true;
    var v = c.Resultats || VISIBILITES[0];
    return v === 'Toujours' || (v === 'Après avoir voté' && aVote(c));
  }
  function phaseTexte(c) {
    if (echue(c) && c.Phase !== 'Close') return 'Close (échéance passée)';
    return c.Phase || PHASES[0];
  }

  // Classement : somme des soutiens ou des points, ou moyenne pondérée des notes.
  function resultats(c) {
    var props = propositionsDe(c.id), votes = votesDe(c.id), crits = criteresDe(c.id);
    var lignes = props.map(function (p) {
      var vp = votes.filter(function (v) { return num(v.Proposition) === p.id; });
      var votants = {}; vp.forEach(function (v) { votants[v.Votant] = 1; });
      var r = { p: p, votants: Object.keys(votants).length, score: 0, details: [] };
      if (c.Mode === 'Notation') {
        var poids = 0, somme = 0;
        var liste = crits.length ? crits : [{ id: 0, Nom: 'Note', Poids: 1 }];
        liste.forEach(function (cr) {
          var notes = vp.filter(function (v) { return num(v.Critere) === cr.id; }).map(function (v) { return nombre(v.Valeur); });
          var moy = notes.length ? notes.reduce(function (a, b) { return a + b; }, 0) / notes.length : null;
          var w = nombre(cr.Poids) || 1;
          r.details.push({ nom: cr.Nom, moyenne: moy, n: notes.length });
          if (moy !== null) { somme += moy * w; poids += w; }
        });
        r.score = poids ? somme / poids : 0;
      } else {
        r.score = vp.reduce(function (s, v) { return s + nombre(v.Valeur); }, 0);
      }
      return r;
    });
    lignes.sort(function (a, b) { return b.score - a.score || b.votants - a.votants || a.p.id - b.p.id; });
    return lignes;
  }
  function scoreTexte(c, r) {
    if (c.Mode === 'Notation') return r.votants ? arrondi(r.score, 1).toLocaleString('fr-FR') + ' / 5' : 'pas encore notée';
    if (c.Mode === 'Vote par points') return pluriel(r.score, 'point');
    if (c.Mode === 'Choix unique') return pluriel(r.score, 'voix', 'voix');
    return pluriel(r.score, 'soutien');
  }

  // ---------------------------------------------------------------------------
  // Écritures
  // ---------------------------------------------------------------------------

  function ecrire(actions) {
    if (!DEMO) return grist.docApi.applyUserActions(actions);
    var ret = [];
    actions.forEach(function (a) {
      var t = a[1];
      if (a[0] === 'AddRecord') {
        var id = data[t].reduce(function (m, l) { return Math.max(m, l.id); }, 0) + 1;
        var l = Object.assign({ id: id }, a[3]);
        if (t === 'Votes') { l.Votant = moi.email; l.Vote_le = Date.now() / 1000; }
        if (t === 'Propositions') { l.Deposee_par = moi.nom; l.Deposee_le = Date.now() / 1000; }
        data[t].push(l); ret.push(id);
      } else if (a[0] === 'UpdateRecord') {
        Object.assign(idx[t][a[2]], a[3]); ret.push(null);
      } else if (a[0] === 'RemoveRecord') {
        data[t] = data[t].filter(function (l) { return l.id !== a[2]; }); ret.push(null);
      }
      indexer();
    });
    return Promise.resolve({ retValues: ret });
  }

  function executer(actions, message, apres) {
    if (!actions.length) return Promise.resolve(rendre());
    return ecrire(actions).then(function (res) {
      if (apres) apres(res);
      etat.alerte = message ? { type: 'success', texte: message } : null;
      return DEMO ? null : charger();
    }).then(rendre).catch(function (err) {
      etat.alerte = { type: 'error', texte: 'Enregistrement refusé par Grist. Vérifiez vos droits sur le document. (' + ((err && err.message) || err) + ')' };
      rendre();
    });
  }

  // ---------------------------------------------------------------------------
  // Images : adresse saisie (colonne Image) ou pièce jointe Grist (colonne Illustration)
  // ---------------------------------------------------------------------------

  function pieceJointe(p) {
    var v = p.Illustration;
    if (Array.isArray(v) && v[0] === 'L' && v.length > 1) return v[1];
    if (Array.isArray(v) && typeof v[0] === 'number') return v[0];
    return null;
  }
  function blocImage(p, classe) {
    var src = adresse(p.Image), pj = pieceJointe(p);
    if (!src && !pj) return '';
    return '<div class="' + classe + '"><img class="fr-responsive-img" alt="" ' + (src ? 'src="' + esc(src) + '"' : 'data-piece="' + pj + '"') + '></div>';
  }
  function chargerImages() {
    var imgs = app.querySelectorAll('img[data-piece]');
    if (!imgs.length || DEMO) return;
    var obtenir = jeton && jeton.expire > Date.now() ? Promise.resolve(jeton) :
      grist.docApi.getAccessToken({ readOnly: true }).then(function (t) { jeton = { token: t.token, baseUrl: t.baseUrl, expire: Date.now() + (t.ttlMsecs || 300000) - 30000 }; return jeton; });
    obtenir.then(function (j) {
      Array.prototype.forEach.call(imgs, function (img) {
        img.src = j.baseUrl + '/attachments/' + img.getAttribute('data-piece') + '/download?auth=' + encodeURIComponent(j.token);
      });
    }).catch(function () { /* images indisponibles : le texte reste lisible */ });
  }
  function envoyerPiece(fichier) {
    return grist.docApi.getAccessToken({ readOnly: false }).then(function (t) {
      var f = new FormData();
      f.append('upload', fichier, fichier.name);
      return fetch(t.baseUrl + '/attachments?auth=' + encodeURIComponent(t.token), { method: 'POST', body: f, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    }).then(function (r) {
      if (!r.ok) throw new Error('envoi de l\'image refusé (' + r.status + ')');
      return r.json();
    }).then(function (ids) { return ids[0]; });
  }

  // ---------------------------------------------------------------------------
  // Routage et rendu
  // ---------------------------------------------------------------------------

  function route() {
    var r = routeBrute();
    if (PUBLIC) {
      if (r.vue === 'nouvelle' || r.vue === 'reglages') return { vue: 'accueil' };
      if (r.vue === 'consultation' && (r.onglet === 'deposer' || r.onglet === 'gerer')) r.onglet = 'propositions';
    }
    return r;
  }
  function routeBrute() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    if (h[0] === 'c' && num(h[1])) {
      if (h[2] === 'p' && num(h[3])) return { vue: 'proposition', id: num(h[1]), pid: num(h[3]) };
      return { vue: 'consultation', id: num(h[1]), onglet: h[2] || 'propositions' };
    }
    if (h[0] === 'nouvelle') return { vue: 'nouvelle' };
    if (h[0] === 'reglages') return { vue: 'reglages' };
    return { vue: 'accueil' };
  }

  function rendre() {
    var r = route(), html;
    monterCoque();
    if (PUBLIC && tablesManquantes().length) {
      app.innerHTML = '<div class="fr-alert fr-alert--warning"><p>Cette consultation n\'est pas lisible publiquement. Le document est-il partagé en lecture publique, et les tables ' + tablesManquantes().map(esc).join(', ') + ' sont-elles accessibles ?</p></div>';
      return;
    }
    if (!DEMO && tablesManquantes().length) { app.innerHTML = vueInstallation(); return; }
    if (r.vue === 'accueil') {
      // Une seule consultation : on l'ouvre directement (le fil d'Ariane ramène à la liste).
      if (data.Consultations.length === 1 && !etat.accueilVu) { etat.accueilVu = true; location.replace('#/c/' + data.Consultations[0].id); return; }
      html = vueAccueil();
    } else if (r.vue === 'consultation') html = vueConsultation(r.id, r.onglet);
    else if (r.vue === 'proposition') html = vueProposition(r.id, r.pid);
    else if (r.vue === 'nouvelle') html = vueGerer(null);
    else html = vueAccueil();
    app.innerHTML = html;
    chargerImages();
  }

  function blocAlerte() {
    if (!etat.alerte) return '';
    return '<div class="fr-alert fr-alert--sm fr-alert--' + etat.alerte.type + ' gd-alerte" role="' + (etat.alerte.type === 'error' ? 'alert' : 'status') + '"><p>' + esc(etat.alerte.texte) + '</p></div>';
  }
  function filAriane(liens) {
    return '<nav role="navigation" class="fr-breadcrumb gd-ariane" aria-label="vous êtes ici :"><ol class="fr-breadcrumb__list">' +
      liens.map(function (l, i) {
        return '<li>' + (i < liens.length - 1 ? '<a class="fr-breadcrumb__link" href="' + l[1] + '">' + esc(l[0]) + '</a>' : '<a class="fr-breadcrumb__link" aria-current="page">' + esc(l[0]) + '</a>') + '</li>';
      }).join('') + '</ol></nav>';
  }
  function champ(id, lib, val, o) {
    o = o || {};
    var attrs = (o.cle ? ' data-brouillon="' + o.cle + '" data-champ="' + o.champ + '"' : '') + (o.attrs ? ' ' + o.attrs : '');
    var ctrl = o.multiligne ? '<textarea class="fr-input" id="' + id + '" rows="' + (o.lignes || 4) + '"' + attrs + '>' + esc(val) + '</textarea>'
      : '<input class="fr-input" type="' + (o.type || 'text') + '" id="' + id + '" value="' + esc(val) + '"' + attrs + '>';
    return '<div class="fr-input-group' + (o.large ? ' gd-large' : '') + '"><label class="fr-label" for="' + id + '">' + esc(lib) + (o.requis ? ' <span class="gd-requis">(obligatoire)</span>' : '') +
      (o.aide ? '<span class="fr-hint-text">' + esc(o.aide) + '</span>' : '') + '</label>' + ctrl + '</div>';
  }
  function select(id, lib, val, options, o) {
    o = o || {};
    var attrs = (o.cle ? ' data-brouillon="' + o.cle + '" data-champ="' + o.champ + '"' : '') + (o.attrs ? ' ' + o.attrs : '');
    return '<div class="fr-select-group"><label class="fr-label" for="' + id + '">' + esc(lib) + (o.aide ? '<span class="fr-hint-text">' + esc(o.aide) + '</span>' : '') + '</label>' +
      '<select class="fr-select" id="' + id + '"' + attrs + '>' + (o.vide !== undefined ? '<option value="">' + esc(o.vide) + '</option>' : '') +
      options.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select></div>';
  }

  // --- Accueil --------------------------------------------------------------

  function carteConsultation(c) {
    var props = propositionsDe(c.id), n = participants(c.id);
    var info = [pluriel(props.length, 'proposition'), pluriel(n, 'participant')];
    if (c.Echeance) info.push((echue(c) ? 'close le ' : 'jusqu\'au ') + dateTexte(c.Echeance));
    return '<div class="fr-card fr-enlarge-link"><div class="fr-card__body"><div class="fr-card__content">' +
      '<h2 class="fr-card__title"><a href="#/c/' + c.id + '">' + esc(c.Titre || 'Consultation sans titre') + '</a></h2>' +
      (c.Question ? '<p class="fr-card__desc">' + esc(c.Question) + '</p>' : '') +
      '<div class="fr-card__start"><ul class="fr-badges-group"><li>' + badge(phaseTexte(c), close(c) ? '' : 'success') + '</li><li>' + badge(c.Mode || MODES[0], 'info') + '</li></ul></div>' +
      '<div class="fr-card__end"><p class="fr-card__detail">' + esc(info.join(' · ')) + '</p></div>' +
      '</div></div></div>';
  }
  function vueAccueil() {
    etat.accueilVu = true;
    var ouvertes = data.Consultations.filter(function (c) { return !close(c); });
    var closes = data.Consultations.filter(close).sort(function (a, b) { return (b.Echeance || 0) - (a.Echeance || 0); });
    var h = '<div class="gd-titre-ligne"><h1 class="fr-h3">Consultations</h1>' +
      (lectureSeule ? '' : '<a class="fr-btn fr-btn--secondary fr-icon-add-line fr-btn--icon-left" href="#/nouvelle">Nouvelle consultation</a>') + '</div>' + blocAlerte() + blocLectureSeule();
    if (!data.Consultations.length) return h + '<p>Aucune consultation pour l\'instant. Créez-en une pour recueillir des idées, valoriser des réalisations ou faire choisir l\'équipe.</p>';
    h += '<h2 class="fr-h5">En cours <span class="gd-compte">(' + ouvertes.length + ')</span></h2>';
    h += ouvertes.length ? '<div class="gd-cartes">' + ouvertes.map(carteConsultation).join('') + '</div>' : '<p>Aucune consultation en cours.</p>';
    if (closes.length) h += '<h2 class="fr-h5 fr-mt-4w">Closes <span class="gd-compte">(' + closes.length + ')</span></h2><div class="gd-cartes">' + closes.map(carteConsultation).join('') + '</div>';
    return h;
  }
  // Page publique : le vote se fait dans un questionnaire (adresse dans les réglages, {consultation} = numéro).
  function lienVote(c) {
    var u = reglages.publication && reglages.publication.lienVote;
    return u ? String(u).replace(/\{consultation\}/g, c ? c.id : '') : '';
  }
  function appelVote(c) {
    var u = lienVote(c);
    if (!PUBLIC || !u || !voteOuvert(c)) return '';
    return '<div class="fr-callout gd-bandeau"><p class="fr-callout__text">Pour voter ou déposer une proposition, répondez au questionnaire.</p>' +
      '<a class="fr-btn fr-mt-1w" href="' + esc(adresse(u)) + '" target="_blank" rel="noopener" title="Voter - nouvelle fenêtre">Voter</a></div>';
  }
  function blocLectureSeule() {
    if (PUBLIC) return '';
    return lectureSeule ? '<div class="fr-notice fr-notice--info gd-alerte"><div class="fr-container"><div class="fr-notice__body"><p class="fr-notice__title">Vous consultez ce document en lecture seule : vous ne pouvez ni déposer ni voter.</p></div></div></div>' : '';
  }

  // --- Consultation ---------------------------------------------------------

  function enteteConsultation(c, onglet) {
    var onglets = [['propositions', 'Propositions'], ['deposer', 'Déposer'], ['resultats', 'Résultats et suites'], ['gerer', 'Gérer']];
    if (!depotOuvert(c) || lectureSeule) onglets = onglets.filter(function (o) { return o[0] !== 'deposer'; });
    if (lectureSeule) onglets = onglets.filter(function (o) { return o[0] !== 'gerer'; });
    var infos = [];
    if (c.Echeance) infos.push((echue(c) ? 'Close le ' : 'Ouverte jusqu\'au ') + dateTexte(c.Echeance));
    infos.push(pluriel(propositionsDe(c.id).length, 'proposition'));
    infos.push(pluriel(participants(c.id), 'participant'));
    return filAriane([['Consultations', '#/'], [c.Titre || 'Consultation', '#/c/' + c.id]]) +
      '<div class="gd-titre-ligne"><div><h1 class="fr-h3">' + esc(c.Titre || 'Consultation sans titre') + '</h1>' +
      (c.Question ? '<p class="fr-text--lead gd-question">' + esc(c.Question) + '</p>' : '') +
      '<p class="gd-meta">' + esc(infos.join(' · ')) + '</p></div>' +
      '<ul class="fr-badges-group"><li>' + badge(phaseTexte(c), close(c) ? '' : 'success') + '</li><li>' + badge(c.Mode || MODES[0], 'info') + '</li></ul></div>' +
      (c.Description ? '<div class="gd-description">' + texteMultiligne(c.Description) + '</div>' : '') +
      '<nav class="gd-onglets" aria-label="Sections de la consultation"><ul class="fr-btns-group fr-btns-group--inline-sm fr-btns-group--sm">' +
      onglets.map(function (o) {
        var actif = o[0] === onglet;
        return '<li><a class="fr-btn ' + (actif ? '' : 'fr-btn--secondary') + '" href="#/c/' + c.id + '/' + o[0] + '"' + (actif ? ' aria-current="page"' : '') + '>' + o[1] + '</a></li>';
      }).join('') + '</ul></nav>' + blocAlerte() + blocLectureSeule();
  }

  function vueConsultation(id, onglet) {
    var c = consultation(id);
    if (!c) return filAriane([['Consultations', '#/'], ['Introuvable', '']]) + '<p>Cette consultation n\'existe plus.</p>';
    var h = enteteConsultation(c, onglet);
    if (onglet === 'deposer') return h + vueDeposer(c);
    if (onglet === 'resultats') return h + vueResultats(c);
    if (onglet === 'gerer') return h + vueGerer(c);
    return h + vuePropositions(c);
  }

  function bandeauVote(c) {
    if (!voteOuvert(c)) {
      if (close(c)) return '<div class="fr-callout gd-bandeau"><p class="fr-callout__text">Le vote est clos. Consultez les résultats et les suites données.</p></div>';
      return '<div class="fr-callout gd-bandeau"><p class="fr-callout__text">Le vote n\'est pas encore ouvert : c\'est le temps du dépôt des propositions.</p></div>';
    }
    if (PUBLIC) return appelVote(c);
    if (lectureSeule || !moi) return '';
    var t = AIDE_MODE[c.Mode] || AIDE_MODE.Soutien, compte = '';
    if (c.Mode === 'Vote par points') {
      var reste = budget(c) - pointsUtilises(c);
      compte = '<p class="gd-reste" aria-live="polite"><strong>' + pluriel(reste, 'point') + ' restant' + (reste > 1 ? 's' : '') + '</strong> sur ' + budget(c) +
        ' · au plus ' + pluriel(maxParProposition(c), 'point') + ' par proposition</p>';
    } else if (c.Mode === 'Soutien') {
      compte = '<p class="gd-reste" aria-live="polite">Vous soutenez ' + pluriel(mesVotes(c.id).length, 'proposition') + '.</p>';
    } else if (c.Mode === 'Choix unique') {
      var v = mesVotes(c.id)[0], p = v && idx.Propositions[num(v.Proposition)];
      compte = '<p class="gd-reste" aria-live="polite">' + (p ? 'Votre choix : <strong>' + esc(p.Titre) + '</strong>' : 'Vous n\'avez pas encore choisi.') + '</p>';
    } else {
      var notees = {}; mesVotes(c.id).forEach(function (x) { notees[num(x.Proposition)] = 1; });
      compte = '<p class="gd-reste" aria-live="polite">Vous avez évalué ' + Object.keys(notees).length + ' proposition' + (Object.keys(notees).length > 1 ? 's' : '') + ' sur ' + propositionsDe(c.id).length + '.</p>';
    }
    return '<div class="fr-callout fr-callout--green-menthe gd-bandeau"><p class="fr-callout__text">' + esc(t) + '</p>' + compte +
      (!resultatsVisibles(c) ? '<p class="fr-text--sm fr-mb-0">Les résultats seront visibles ' + (c.Resultats === 'Après avoir voté' ? 'après votre vote.' : 'à la clôture.') + '</p>' : '') + '</div>';
  }

  function controleVote(c, p, r, complet) {
    if (!voteOuvert(c) || lectureSeule || !moi) return '';
    var v = monVote(c.id, p.id);
    if (c.Mode === 'Soutien') {
      return '<button type="button" class="fr-btn fr-btn--sm ' + (v ? 'fr-icon-heart-fill' : 'fr-btn--secondary fr-icon-heart-line') + ' fr-btn--icon-left" aria-pressed="' + (!!v) + '" data-soutenir="' + p.id + '">' +
        (v ? 'Soutenue' : 'Soutenir') + '<span class="fr-sr-only"> : ' + esc(p.Titre) + '</span></button>';
    }
    if (c.Mode === 'Choix unique') {
      return '<button type="button" class="fr-btn fr-btn--sm ' + (v ? 'fr-icon-check-line' : 'fr-btn--secondary') + (v ? ' fr-btn--icon-left' : '') + '" aria-pressed="' + (!!v) + '" data-choisir="' + p.id + '">' +
        (v ? 'Votre choix' : 'Choisir') + '<span class="fr-sr-only"> : ' + esc(p.Titre) + '</span></button>';
    }
    if (c.Mode === 'Vote par points') {
      var mes = v ? nombre(v.Valeur) : 0, reste = budget(c) - pointsUtilises(c);
      return '<div class="gd-points" role="group" aria-label="Vos points pour ' + esc(p.Titre) + '">' +
        '<button type="button" class="fr-btn fr-btn--sm fr-btn--secondary fr-icon-subtract-line" title="Retirer un point" data-points="' + p.id + '" data-sens="-1"' + (mes ? '' : ' disabled') + '>Retirer un point</button>' +
        '<span class="gd-points__n">' + pluriel(mes, 'point') + '</span>' +
        '<button type="button" class="fr-btn fr-btn--sm fr-btn--secondary fr-icon-add-line" title="Ajouter un point" data-points="' + p.id + '" data-sens="1"' + (reste > 0 && mes < maxParProposition(c) ? '' : ' disabled') + '>Ajouter un point</button></div>';
    }
    // Notation : sur la fiche de la proposition.
    if (!complet) {
      var nb = mesVotes(c.id).filter(function (x) { return num(x.Proposition) === p.id; }).length;
      return '<a class="fr-btn fr-btn--sm ' + (nb ? 'fr-btn--tertiary' : 'fr-btn--secondary') + '" href="#/c/' + c.id + '/p/' + p.id + '">' + (nb ? 'Modifier mes notes' : 'Évaluer') + '<span class="fr-sr-only"> : ' + esc(p.Titre) + '</span></a>';
    }
    var crits = criteresDe(c.id); if (!crits.length) crits = [{ id: 0, Nom: 'Votre note', Description: '' }];
    return '<div class="gd-notation">' + crits.map(function (cr) {
      var vv = monVote(c.id, p.id, cr.id), val = vv ? num(vv.Valeur) : 0, nomGroupe = 'n-' + p.id + '-' + cr.id;
      return '<fieldset class="fr-segmented fr-segmented--sm gd-segment"><legend class="fr-segmented__legend">' + esc(cr.Nom) +
        (cr.Description ? '<span class="fr-hint-text">' + esc(cr.Description) + '</span>' : '') + '</legend><div class="fr-segmented__elements">' +
        [1, 2, 3, 4, 5].map(function (n) {
          var iid = nomGroupe + '-' + n;
          return '<div class="fr-segmented__element"><input type="radio" id="' + iid + '" name="' + nomGroupe + '" value="' + n + '"' + (val === n ? ' checked' : '') +
            ' data-noter="' + p.id + '" data-critere="' + cr.id + '"><label class="fr-label" for="' + iid + '">' + n + '</label></div>';
        }).join('') + '</div></fieldset>';
    }).join('') + '<p class="fr-text--xs gd-meta">1 : faible · 5 : excellent. Votre note est enregistrée dès que vous la choisissez.</p></div>';
  }

  function carteProposition(c, p, rang) {
    var r = resultatsVisibles(c) ? rang[p.id] : null;
    var auteur = [p.Auteur || p.Deposee_par, p.Structure].filter(Boolean).join(' · ');
    var extrait = String(p.Description || '');
    if (extrait.length > 180) extrait = extrait.slice(0, 177).replace(/\s+\S*$/, '') + '…';
    return '<article class="gd-prop">' + blocImage(p, 'gd-prop__image') +
      '<div class="gd-prop__corps"><ul class="fr-badges-group gd-prop__badges"><li>' + badgeType(p.Type || L.types[0]) + '</li>' + (badgeStatut(p.Statut) ? '<li>' + badgeStatut(p.Statut) + '</li>' : '') + '</ul>' +
      '<h2 class="fr-h6 gd-prop__titre"><a href="#/c/' + c.id + '/p/' + p.id + '">' + esc(p.Titre || 'Sans titre') + '</a></h2>' +
      (auteur ? '<p class="gd-meta">' + esc(auteur) + '</p>' : '') +
      (extrait ? '<p class="fr-text--sm gd-prop__extrait">' + esc(extrait) + '</p>' : '') + '</div>' +
      '<div class="gd-prop__pied">' + controleVote(c, p, r) + (r ? '<span class="gd-score">' + esc(scoreTexte(c, r)) + '</span>' : '') + '</div></article>';
  }

  function vuePropositions(c) {
    var f = etat.filtres[c.id] = etat.filtres[c.id] || {};
    var props = propositionsDe(c.id);
    var res = resultatsVisibles(c) ? resultats(c) : [], rang = {};
    res.forEach(function (r) { rang[r.p.id] = r; });
    var types = L.types.filter(function (t) { return props.some(function (p) { return (p.Type || L.types[0]) === t; }); });
    var liste = props.filter(function (p) {
      if (f.type && (p.Type || L.types[0]) !== f.type) return false;
      if (f.statut && (p.Statut || L.statuts[0]) !== f.statut) return false;
      if (f.mes && !monVote(c.id, p.id)) return false;
      if (f.q) {
        var t = (p.Titre + ' ' + (p.Description || '') + ' ' + (p.Auteur || '') + ' ' + (p.Structure || '')).toLowerCase();
        if (t.indexOf(f.q.toLowerCase()) < 0) return false;
      }
      return true;
    });
    var tri = f.tri || (voteOuvert(c) ? 'hasard' : (resultatsVisibles(c) ? 'resultats' : 'recentes'));
    var graine = moi ? moi.email : 'demo';
    liste.sort(function (a, b) {
      if (tri === 'resultats' && rang[a.id] && rang[b.id]) return (rang[b.id].score - rang[a.id].score) || a.id - b.id;
      if (tri === 'hasard') return hachage(graine + a.id) - hachage(graine + b.id);
      return (b.Deposee_le || b.id) - (a.Deposee_le || a.id);
    });
    var tris = [['hasard', 'Au hasard'], ['recentes', 'Plus récentes']];
    if (resultatsVisibles(c)) tris.push(['resultats', 'Classement']);
    var h = bandeauVote(c) +
      '<div class="gd-filtres">' +
      '<div class="fr-input-group"><label class="fr-label" for="f-q">Rechercher</label><input class="fr-input" type="search" id="f-q" value="' + esc(f.q || '') + '" data-filtre="q" data-c="' + c.id + '"></div>' +
      (types.length > 1 ? select('f-type', 'Type', f.type || '', types, { vide: 'Tous les types', attrs: 'data-filtre="type" data-c="' + c.id + '"' }) : '') +
      select('f-statut', 'Suite donnée', f.statut || '', L.statuts, { vide: 'Toutes', attrs: 'data-filtre="statut" data-c="' + c.id + '"' }) +
      '<div class="fr-select-group"><label class="fr-label" for="f-tri">Ordre</label><select class="fr-select" id="f-tri" data-filtre="tri" data-c="' + c.id + '">' +
      tris.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === tri ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></div>' +
      (voteOuvert(c) && moi ? '<div class="fr-checkbox-group gd-case"><input type="checkbox" id="f-mes" data-filtre="mes" data-c="' + c.id + '"' + (f.mes ? ' checked' : '') + '><label class="fr-label" for="f-mes">Seulement mes votes</label></div>' : '') +
      '</div>' +
      '<p class="gd-meta" aria-live="polite">' + pluriel(liste.length, 'proposition') + (liste.length !== props.length ? ' sur ' + props.length : '') + '</p>';
    if (!props.length) return h + '<p>Aucune proposition pour l\'instant.' + (depotOuvert(c) && !lectureSeule ? ' <a href="#/c/' + c.id + '/deposer">Déposez la première</a>.' : '') + '</p>';
    return h + '<div class="gd-mur">' + liste.map(function (p) { return carteProposition(c, p, rang); }).join('') + '</div>';
  }

  // --- Fiche d'une proposition ----------------------------------------------

  function vueProposition(cid, pid) {
    var c = consultation(cid), p = (idx.Propositions || {})[pid];
    if (!c || !p || num(p.Consultation) !== cid) return filAriane([['Consultations', '#/'], ['Introuvable', '']]) + '<p>Cette proposition n\'existe plus.</p>';
    if (!DEMO) { try { grist.setCursorPos({ rowId: pid }); } catch (e) { /* liaison facultative */ } }
    var res = resultatsVisibles(c) ? resultats(c) : [], r = res.filter(function (x) { return x.p.id === pid; })[0];
    var rangN = r ? res.indexOf(r) + 1 : 0;
    var infos = [];
    if (p.Auteur || p.Deposee_par) infos.push(['Proposée par', p.Auteur || p.Deposee_par]);
    if (p.Structure) infos.push(['Structure', p.Structure]);
    if (p.Deposee_le) infos.push(['Déposée le', new Date(p.Deposee_le * 1000).toLocaleDateString('fr-FR')]);
    var lien = adresse(p.Lien);
    var h = filAriane([['Consultations', '#/'], [c.Titre || 'Consultation', '#/c/' + c.id], [p.Titre || 'Proposition', '']]) + blocAlerte() +
      '<div class="gd-fiche"><div class="gd-fiche__principal">' +
      '<ul class="fr-badges-group"><li>' + badgeType(p.Type || L.types[0]) + '</li>' + (badgeStatut(p.Statut) ? '<li>' + badgeStatut(p.Statut) + '</li>' : '') + '</ul>' +
      '<h1 class="fr-h3">' + esc(p.Titre || 'Sans titre') + '</h1>' + blocImage(p, 'gd-fiche__image') +
      (p.Description ? '<div class="gd-texte">' + texteMultiligne(p.Description) + '</div>' : '') +
      (lien ? '<p><a class="fr-link fr-icon-external-link-line fr-link--icon-right" href="' + esc(lien) + '" target="_blank" rel="noopener" title="' + esc(p.Lien) + ' - nouvelle fenêtre">En savoir plus</a></p>' : '') +
      (p.Suite ? '<div class="fr-callout gd-suite"><h2 class="fr-callout__title fr-h6">Suite donnée</h2><p class="fr-callout__text">' + texteMultiligne(p.Suite) + '</p></div>' : '') +
      '</div><aside class="gd-fiche__cote">' +
      (infos.length ? '<dl class="gd-infos">' + infos.map(function (i) { return '<dt>' + esc(i[0]) + '</dt><dd>' + esc(i[1]) + '</dd>'; }).join('') + '</dl>' : '') +
      (PUBLIC ? appelVote(c) : '') +
      (voteOuvert(c) && !lectureSeule ? '<h2 class="fr-h6">Votre vote</h2><p class="fr-text--sm">' + esc(AIDE_MODE[c.Mode] || AIDE_MODE.Soutien) + '</p>' + controleVote(c, p, r, true) : '') +
      (r ? '<h2 class="fr-h6 fr-mt-3w">Résultat</h2><p><strong>' + esc(scoreTexte(c, r)) + '</strong>' + (rangN ? ' · ' + rangN + '<sup>e</sup> sur ' + res.length : '') + '<br><span class="gd-meta">' + pluriel(r.votants, 'participant') + '</span></p>' +
        (r.details.length > 1 ? '<ul class="gd-criteres">' + r.details.map(function (d) { return '<li>' + esc(d.nom) + ' : ' + (d.moyenne === null ? '–' : arrondi(d.moyenne, 1).toLocaleString('fr-FR')) + '</li>'; }).join('') + '</ul>' : '') : '') +
      '</aside></div><p class="fr-mt-4w"><a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="#/c/' + c.id + '">Retour aux propositions</a></p>';
    return h;
  }

  // --- Dépôt ----------------------------------------------------------------

  function vueDeposer(c) {
    if (!depotOuvert(c)) return '<p>Le dépôt de propositions est fermé pour cette consultation.</p>';
    var cle = 'depot-' + c.id, b = brouillon(cle);
    if (!b.Type) b.Type = L.types[0];
    return '<form class="gd-form" data-form="depot" data-c="' + c.id + '">' +
      '<p class="fr-text--sm">Les champs marqués « obligatoire » doivent être remplis. Votre proposition est visible par toutes les personnes qui ont accès au document.</p>' +
      '<div class="gd-grille">' +
      champ('d-titre', 'Titre', b.Titre || '', { cle: cle, champ: 'Titre', requis: true, large: true, aide: 'Une phrase courte qui donne envie de lire la suite.' }) +
      select('d-type', 'Type de proposition', b.Type, L.types, { cle: cle, champ: 'Type' }) +
      champ('d-auteur', 'Proposée par', b.Auteur || '', { cle: cle, champ: 'Auteur', aide: 'Votre nom ou celui de l\'équipe. Laissez vide pour utiliser votre nom de compte.' }) +
      champ('d-desc', 'Description', b.Description || '', { cle: cle, champ: 'Description', multiligne: true, lignes: 6, requis: true, large: true, aide: 'Le constat, ce que vous proposez ou ce que vous avez réalisé, ce que cela change.' }) +
      champ('d-structure', 'Structure ou service', b.Structure || '', { cle: cle, champ: 'Structure' }) +
      champ('d-lien', 'Lien pour en savoir plus', b.Lien || '', { cle: cle, champ: 'Lien', type: 'url', aide: 'Adresse d\'un document, d\'une page ou d\'une vidéo. Facultatif.' }) +
      '<div class="fr-upload-group gd-large"><label class="fr-label" for="d-image">Image ou photo<span class="fr-hint-text">Facultatif. PNG, JPEG, GIF ou WebP, 2 Mo au plus. N\'ajoutez pas de photo de personnes sans leur accord.</span></label>' +
      '<input class="fr-upload" type="file" id="d-image" accept="image/png,image/jpeg,image/gif,image/webp"></div>' +
      '</div><ul class="fr-btns-group fr-btns-group--inline-md"><li><button type="submit" class="fr-btn">Déposer la proposition</button></li></ul></form>';
  }

  // --- Résultats et suites --------------------------------------------------

  function vueResultats(c) {
    var props = propositionsDe(c.id);
    if (!props.length) return '<p>Aucune proposition pour l\'instant.</p>';
    if (!resultatsVisibles(c)) {
      return '<div class="fr-callout"><p class="fr-callout__text">Les résultats seront visibles ' + (c.Resultats === 'Après avoir voté' ? 'après votre vote.' : 'à la clôture de la consultation.') +
        '</p></div>' + vueSuites(c, props.map(function (p) { return { p: p }; }), false);
    }
    var res = resultats(c), max = res.reduce(function (m, r) { return Math.max(m, r.score); }, 0) || 1;
    var n = participants(c.id), connus = data.Votants.length;
    var h = '<ul class="gd-chiffres"><li><span class="gd-chiffres__n">' + n + '</span> participant' + (n > 1 ? 's' : '') + (connus >= n && connus ? ' sur ' + connus + ' personnes venues' : '') + '</li>' +
      '<li><span class="gd-chiffres__n">' + props.length + '</span> proposition' + (props.length > 1 ? 's' : '') + '</li>' +
      '<li><span class="gd-chiffres__n">' + votesDe(c.id).length + '</span> ' + (c.Mode === 'Notation' ? 'notes' : 'votes') + '</li></ul>' +
      '<h2 class="fr-h5">Classement</h2><ol class="gd-classement">' + res.map(function (r, i) {
        var part = Math.round(r.score / max * 100);
        return '<li class="gd-classement__ligne"><span class="gd-classement__rang">' + (i + 1) + '</span><div class="gd-classement__corps">' +
          '<p class="gd-classement__titre"><a href="#/c/' + c.id + '/p/' + r.p.id + '">' + esc(r.p.Titre) + '</a> ' + badgeStatut(r.p.Statut) + '</p>' +
          '<div class="gd-barre" aria-hidden="true"><span style="width:' + part + '%"></span></div>' +
          '<p class="gd-meta">' + esc(scoreTexte(c, r)) + ' · ' + pluriel(r.votants, 'participant') +
          (c.Mode === 'Notation' && r.details.length > 1 ? ' · ' + r.details.map(function (d) { return esc(d.nom) + ' ' + (d.moyenne === null ? '–' : arrondi(d.moyenne, 1).toLocaleString('fr-FR')); }).join(', ') : '') + '</p></div></li>';
      }).join('') + '</ol>' +
      '<div class="gd-boutons gd-ecran"><button type="button" class="fr-btn fr-btn--sm fr-btn--secondary fr-icon-printer-line fr-btn--icon-left" data-action="imprimer">Imprimer ou enregistrer en PDF</button>' +
      '<button type="button" class="fr-btn fr-btn--sm fr-btn--secondary fr-icon-file-copy-line fr-btn--icon-left" data-copier="' + c.id + '">Copier le résultat</button></div>';
    return h + vueSuites(c, res, true);
  }
  function texteResultats(c) {
    var res = resultats(c);
    return [c.Titre, c.Question || '', 'Participants : ' + participants(c.id), ''].concat(res.map(function (r, i) {
      return (i + 1) + '. ' + r.p.Titre + ' – ' + scoreTexte(c, r) + (r.p.Statut && r.p.Statut !== L.statuts[0] ? ' – ' + r.p.Statut : '') + (r.p.Suite ? '\n   Suite : ' + r.p.Suite : '');
    })).join('\n');
  }
  function vueSuites(c, liste, visibles) {
    if (lectureSeule) return '';
    return '<section class="gd-ecran"><h2 class="fr-h5 fr-mt-4w">Suites données</h2><p class="fr-text--sm">Indiquez ce qu\'il advient de chaque proposition : l\'équipe le voit sur la proposition. ' +
      (visibles ? '' : 'Les propositions sont présentées dans l\'ordre de dépôt.') + '</p>' +
      liste.map(function (r) {
        var p = r.p, cle = 'suite-' + p.id, b = brouillon(cle);
        return '<form class="gd-suite-ligne" data-form="suite" data-p="' + p.id + '"><p class="gd-suite-ligne__titre"><strong>' + esc(p.Titre) + '</strong></p><div class="gd-suite-ligne__champs">' +
          select('s-statut-' + p.id, 'Suite', b.Statut !== undefined ? b.Statut : (p.Statut || L.statuts[0]), L.statuts, { cle: cle, champ: 'Statut' }) +
          champ('s-texte-' + p.id, 'Explication pour l\'équipe', b.Suite !== undefined ? b.Suite : (p.Suite || ''), { cle: cle, champ: 'Suite', multiligne: true, lignes: 2 }) +
          '<button type="submit" class="fr-btn fr-btn--sm fr-btn--secondary">Enregistrer<span class="fr-sr-only"> la suite de ' + esc(p.Titre) + '</span></button></div></form>';
      }).join('') + '</section>';
  }

  // --- Création et gestion d'une consultation -------------------------------

  function vueGerer(c) {
    var cle = 'gerer-' + (c ? c.id : 'n'), b = brouillon(cle);
    function v(k, d) { return b[k] !== undefined ? b[k] : (c && c[k] !== undefined && c[k] !== null ? c[k] : d); }
    var h = c ? '' : filAriane([['Consultations', '#/'], ['Nouvelle consultation', '']]) + '<h1 class="fr-h3">Nouvelle consultation</h1>' + blocAlerte();
    var mode = v('Mode', MODES[0]);
    h += '<form class="gd-form" data-form="gerer" data-c="' + (c ? c.id : '') + '"><div class="gd-grille">' +
      champ('g-titre', 'Titre', v('Titre', ''), { cle: cle, champ: 'Titre', requis: true, large: true, aide: 'Par exemple : Boîte à idées de l\'équipe, Nos réussites de l\'année, Priorités du semestre.' }) +
      champ('g-question', 'Question posée', v('Question', ''), { cle: cle, champ: 'Question', large: true, aide: 'Elle apparaît sous le titre.' }) +
      champ('g-desc', 'Présentation', v('Description', ''), { cle: cle, champ: 'Description', multiligne: true, lignes: 3, large: true, aide: 'Contexte, règles du jeu, ce qui sera fait des résultats.' }) +
      select('g-mode', 'Mode de vote', mode, MODES, { cle: cle, champ: 'Mode', aide: 'Soutien : boîte à idées, coups de cœur. Points ou choix unique : prioriser. Notation : comparer selon des critères.' }) +
      select('g-phase', 'Étape', v('Phase', PHASES[0]), PHASES, { cle: cle, champ: 'Phase' }) +
      champ('g-echeance', 'Clôture automatique le', dateVersSaisie(v('Echeance', null)), { cle: cle, champ: 'Echeance', type: 'date', aide: 'Facultatif. Après cette date, dépôt et vote sont fermés.' }) +
      select('g-resultats', 'Résultats visibles', v('Resultats', VISIBILITES[0]), VISIBILITES, { cle: cle, champ: 'Resultats', aide: 'Les cacher jusqu\'à la clôture évite que les premiers votes influencent les suivants.' }) +
      (mode === 'Vote par points' ? champ('g-points', 'Points par personne', v('Points', 5), { cle: cle, champ: 'Points', type: 'number', attrs: 'min="1"' }) +
        champ('g-max', 'Points au plus par proposition', v('Max_par_proposition', 3), { cle: cle, champ: 'Max_par_proposition', type: 'number', attrs: 'min="1"' }) : '') +
      '</div><ul class="fr-btns-group fr-btns-group--inline-md"><li><button type="submit" class="fr-btn">' + (c ? 'Enregistrer' : 'Créer la consultation') + '</button></li></ul></form>';
    if (c && (mode === 'Notation')) h += vueCriteres(c);
    if (c) {
      h += '<section class="fr-mt-6w"><h2 class="fr-h5">Supprimer la consultation</h2>';
      h += etat.suppression === 'c' + c.id ?
        '<div class="fr-alert fr-alert--warning"><p>La consultation, ses ' + propositionsDe(c.id, true).length + ' propositions et tous les votes seront supprimés. Cette action ne peut pas être annulée depuis le widget (utilisez l\'historique de Grist au besoin).</p>' +
          '<ul class="fr-btns-group fr-btns-group--inline-sm fr-mt-2w"><li><button type="button" class="fr-btn fr-btn--sm" data-confirmer-suppression="' + c.id + '">Supprimer définitivement</button></li>' +
          '<li><button type="button" class="fr-btn fr-btn--sm fr-btn--secondary" data-action="annuler-suppression">Annuler</button></li></ul></div>' :
        '<button type="button" class="fr-btn fr-btn--sm fr-btn--tertiary fr-icon-delete-line fr-btn--icon-left" data-demander-suppression="' + c.id + '">Supprimer cette consultation</button>';
      h += '<p class="fr-text--sm fr-mt-2w">Pour masquer une proposition sans la supprimer (doublon, hors sujet), cochez sa case « Masquee » dans la table Propositions.</p></section>';
    }
    return h;
  }
  function vueCriteres(c) {
    var crits = criteresDe(c.id), cle = 'critere-' + c.id, b = brouillon(cle);
    return '<section class="fr-mt-6w"><h2 class="fr-h5">Critères de notation</h2><p class="fr-text--sm">Chaque proposition est notée de 1 à 5 sur chaque critère. Le poids donne plus ou moins d\'importance à un critère dans le classement.</p>' +
      (crits.length ? '<div class="fr-table fr-table--sm"><div class="fr-table__wrapper"><div class="fr-table__container"><div class="fr-table__content"><table><caption class="fr-sr-only">Critères</caption><thead><tr><th>Critère</th><th>Précision</th><th>Poids</th><th><span class="fr-sr-only">Actions</span></th></tr></thead><tbody>' +
        crits.map(function (cr) {
          return '<tr><td>' + esc(cr.Nom) + '</td><td>' + esc(cr.Description || '') + '</td><td><input class="fr-input gd-poids" type="number" min="0" step="0.5" value="' + esc(cr.Poids === null || cr.Poids === undefined ? 1 : cr.Poids) + '" data-poids="' + cr.id + '" aria-label="Poids de ' + esc(cr.Nom) + '"></td>' +
            '<td><button type="button" class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-delete-line" title="Supprimer le critère ' + esc(cr.Nom) + '" data-supprimer-critere="' + cr.id + '">Supprimer</button></td></tr>';
        }).join('') + '</tbody></table></div></div></div></div>' : '<p>Aucun critère : chaque personne donnera une note globale.</p>') +
      '<form class="gd-ajout" data-form="critere" data-c="' + c.id + '">' + champ('cr-nom', 'Nouveau critère', b.Nom || '', { cle: cle, champ: 'Nom' }) +
      champ('cr-desc', 'Précision', b.Description || '', { cle: cle, champ: 'Description' }) +
      champ('cr-poids', 'Poids', b.Poids || 1, { cle: cle, champ: 'Poids', type: 'number', attrs: 'min="0" step="0.5"' }) +
      '<button type="submit" class="fr-btn fr-btn--secondary">Ajouter</button></form></section>';
  }

  // --- Réglages -------------------------------------------------------------

  var brouillonReglages = null;
  var LISTES_REGLABLES = [
    ['types', 'Types de propositions', 'Propositions', 'Type', 'Le premier type est proposé par défaut au dépôt.'],
    ['statuts', 'Suites possibles', 'Propositions', 'Statut', 'La première valeur est celle des propositions nouvelles.']
  ];
  function reglagesPropres() {
    var b = brouillonReglages; b.listes = b.listes || {};
    var h = '<div class="cl-panneau"><p class="fr-text--sm">Réservé aux propriétaires du document. Les réglages sont enregistrés dans la description de la colonne <code>' + (meta.nomColConfig || NOM_COLONNE_CONFIG) + '</code> de la table Consultations.</p>' +
      '<h2 class="fr-h5">Listes de valeurs</h2><p class="fr-text--sm">Une valeur par ligne. Les choix des colonnes Grist sont mis à jour à l\'enregistrement.</p>';
    LISTES_REGLABLES.forEach(function (l) {
      h += '<div class="fr-input-group"><label class="fr-label" for="rg-' + l[0] + '">' + esc(l[1]) + '<span class="fr-hint-text">Colonne ' + l[2] + '.' + l[3] + '. ' + esc(l[4]) + '</span></label>' +
        '<textarea class="fr-input" rows="5" id="rg-' + l[0] + '">' + esc((b.listes[l[0]] && b.listes[l[0]].length ? b.listes[l[0]] : DEFAUTS[l[0]]).join('\n')) + '</textarea></div>';
    });
    return h + '</div>';
  }
  var configLab = null;
  function monterCoque() {
    var z = document.getElementById('gd-coque');
    if (configLab || !z || !window.ConfigLab) return;
    brouillonReglages = JSON.parse(JSON.stringify(reglages || {}));
    brouillonReglages.page = brouillonReglages.page || { marque: '', titre: 'Consultations', pied: { accessibilite: '' } };
    configLab = window.ConfigLab.monter(z, {
      nom: 'Consultations',
      vue: { libelle: 'Consultations', element: app },
      ongletInitial: route().vue === 'reglages' ? 'reglages' : 'vue',
      page: brouillonReglages.page,
      onglets: [{ id: 'reglages', libelle: 'Réglages', rendre: function (zone) { zone.innerHTML = reglagesPropres(); } }],
      apercu: function (zone) {
        zone.innerHTML = '<h1 class="fr-h3">Consultations</h1><p class="fr-text--sm">En cours</p>' +
          '<div class="fr-card fr-card--sm fr-mb-2w"><div class="fr-card__body"><div class="fr-card__content"><h2 class="fr-card__title">Exemple de consultation</h2><p class="fr-card__desc">L\'en-tête et le pied de page ci-dessus encadrent tous les écrans de l\'outil.</p></div></div></div>';
      },
      publication: { mode: 'connecte', adresseWidget: location.href.split('#')[0].split('?')[0],
        publier: {
          lienDoc: (brouillonReglages.publication && brouillonReglages.publication.lienDoc) || '',
          texte: 'Les consultations, propositions, résultats et suites données s\'affichent en page complète, sans compte Grist, en lecture seule. Les adresses de courriel des votants ne sont jamais lues par la page publique, mais protégez-les aussi dans les permissions avancées du document.',
          champs: [{ libelle: 'Lien du questionnaire de vote (facultatif)', aide: 'La page publique propose un bouton « Voter » vers ce lien. {consultation} est remplacé par le numéro de la consultation.',
            exemple: 'https://…/questionnaire/?consultation={consultation}', valeur: (brouillonReglages.publication && brouillonReglages.publication.lienVote) || '' }],
          construire: function (l) { return window.GristPublic ? window.GristPublic.lien(location.href.split('#')[0].split('?')[0], { doc: l, table: 'Consultations' }) : null; },
          surChangement: function (l, champs) { brouillonReglages.publication = { lienDoc: l, lienVote: (champs && champs[0] && champs[0].valeur) || '' }; }
        } },
      surEnregistrer: enregistrerReglages
    });
  }
  function enregistrerReglages() {
    var b = brouillonReglages;
    if (DEMO) { if (configLab) configLab.message('info', 'Mode démonstration : rien n\'est enregistré. Dans Grist, les réglages sont enregistrés dans le document.'); return; }
    LISTES_REGLABLES.forEach(function (l) {
      var v = document.getElementById('rg-' + l[0]).value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!v.length || v.join('|') === DEFAUTS[l[0]].join('|')) delete b.listes[l[0]]; else b.listes[l[0]] = v;
    });
    var actions = [];
    var nomCol = meta.nomColConfig || NOM_COLONNE_CONFIG;
    if (!meta.colConfig) actions.push(['AddColumn', 'Consultations', nomCol, { type: 'Text', label: nomCol }]);
    actions.push(['ModifyColumn', 'Consultations', nomCol, { description: JSON.stringify(b) }]);
    LISTES_REGLABLES.forEach(function (l) {
      var c = colonne(l[2], l[3]);
      if (!c || !/^Choice/.test(c.type)) return;
      var o = {}; try { o = JSON.parse(c.widgetOptions || '{}'); } catch (e) { o = {}; }
      o.choices = b.listes[l[0]] || DEFAUTS[l[0]];
      actions.push(['ModifyColumn', l[2], l[3], { widgetOptions: JSON.stringify(o) }]);
    });
    grist.docApi.applyUserActions(actions).then(function () {
      meta.colConfig = true; meta.nomColConfig = nomCol; appliquerReglages(b);
      if (configLab) { configLab.enregistre(); configLab.message('success', 'Réglages enregistrés.'); }
      rendre();
    }).catch(function (err) {
      if (configLab) configLab.message('error', 'Enregistrement impossible : seuls les propriétaires du document peuvent modifier les réglages. (' + ((err && err.message) || err) + ')');
    });
  }
  function colonne(t, c) {
    var tb = meta.tables.filter(function (x) { return x.tableId === t; })[0];
    return tb && meta.colonnes.filter(function (x) { return x.parentId === tb.id && x.colId === c; })[0];
  }

  // ---------------------------------------------------------------------------
  // Installation : création des tables manquantes, exemple facultatif
  // ---------------------------------------------------------------------------

  function choix(l) { return { type: 'Choice', widgetOptions: JSON.stringify({ choices: l }) }; }
  function schema() {
    return {
      Consultations: [['Titre', { type: 'Text' }], ['Question', { type: 'Text' }], ['Description', { type: 'Text' }], ['Mode', choix(MODES)], ['Phase', choix(PHASES)],
        ['Echeance', { type: 'Date' }], ['Resultats', choix(VISIBILITES)], ['Points', { type: 'Int' }], ['Max_par_proposition', { type: 'Int' }], [NOM_COLONNE_CONFIG, { type: 'Text' }]],
      Propositions: [['Consultation', { type: 'Ref:Consultations' }], ['Titre', { type: 'Text' }], ['Description', { type: 'Text' }], ['Type', choix(L.types)],
        ['Auteur', { type: 'Text' }], ['Structure', { type: 'Text' }], ['Lien', { type: 'Text' }], ['Image', { type: 'Text' }], ['Illustration', { type: 'Attachments' }],
        ['Statut', choix(L.statuts)], ['Suite', { type: 'Text' }], ['Masquee', { type: 'Bool' }],
        ['Deposee_par', { type: 'Text', isFormula: false, formula: 'user.Name' }], ['Deposee_le', { type: 'DateTime:Europe/Paris', isFormula: false, formula: 'NOW()' }]],
      Criteres: [['Consultation', { type: 'Ref:Consultations' }], ['Nom', { type: 'Text' }], ['Description', { type: 'Text' }], ['Poids', { type: 'Numeric' }]],
      Votes: [['Consultation', { type: 'Ref:Consultations' }], ['Proposition', { type: 'Ref:Propositions' }], ['Critere', { type: 'Ref:Criteres' }], ['Valeur', { type: 'Numeric' }],
        ['Votant', { type: 'Text', isFormula: false, formula: 'user.Email' }], ['Vote_le', { type: 'DateTime:Europe/Paris', isFormula: false, formula: 'NOW()' }]],
      Votants: [['Email', { type: 'Text', isFormula: false, formula: 'user.Email' }], ['Nom', { type: 'Text', isFormula: false, formula: 'user.Name' }]]
    };
  }
  function tablesManquantes() {
    var ids = meta.tables.map(function (t) { return t.tableId; });
    // Page publique : la table des votants n'est jamais lue, elle peut être masquée par les règles d'accès.
    return TABLES.filter(function (t) { return ids.indexOf(t) < 0 && !(PUBLIC && t === 'Votants'); });
  }
  function vueInstallation() {
    var manquantes = tablesManquantes();
    return '<h1 class="fr-h3">Installer l\'outil de consultation dans ce document</h1>' + blocAlerte() +
      '<p>Le widget a besoin des tables ' + manquantes.map(function (t) { return '<code>' + t + '</code>'; }).join(', ') + '. Il peut les créer pour vous. Les tables existantes ne sont pas modifiées.</p>' +
      '<p class="fr-text--sm">À faire par un propriétaire du document. Le widget doit avoir l\'accès complet au document.</p>' +
      '<ul class="fr-btns-group fr-btns-group--inline-md"><li><button type="button" class="fr-btn" data-installer="vide">Créer les tables</button></li>' +
      '<li><button type="button" class="fr-btn fr-btn--secondary" data-installer="exemple">Créer les tables avec un exemple fictif</button></li></ul>';
  }
  function installer(avecExemple) {
    var sch = schema(), actions = [];
    tablesManquantes().forEach(function (t) { actions.push(['AddTable', t, sch[t].map(function (c) { return Object.assign({ id: c[0] }, c[1]); })]); });
    return grist.docApi.applyUserActions(actions).then(function () {
      return Promise.all([grist.docApi.fetchTable('_grist_Tables'), grist.docApi.fetchTable('_grist_Tables_column')]).then(function (m) {
        meta.tables = lignesDepuisColonnes(m[0]); meta.colonnes = lignesDepuisColonnes(m[1]);
        var aff = [];
        [['Propositions', 'Consultation', 'Consultations', 'Titre'], ['Criteres', 'Consultation', 'Consultations', 'Titre'], ['Votes', 'Consultation', 'Consultations', 'Titre'],
          ['Votes', 'Proposition', 'Propositions', 'Titre'], ['Votes', 'Critere', 'Criteres', 'Nom']].forEach(function (r) {
          var c = colonne(r[0], r[1]), v = colonne(r[2], r[3]);
          if (c && v && !c.visibleCol) { aff.push(['ModifyColumn', r[0], r[1], { visibleCol: v.id }]); aff.push(['SetDisplayFormula', r[0], null, c.id, '$' + r[1] + '.' + r[3]]); }
        });
        return aff.length ? grist.docApi.applyUserActions(aff) : null;
      });
    }).then(function () {
      if (!avecExemple) return null;
      return fetch('exemples/demo.json').then(function (r) { return r.json(); }).then(function (json) {
        var auj = aujourdhui(), ex = [];
        // Les votes fictifs ne sont pas copiés : ils seraient attribués à la personne qui installe.
        ['Consultations', 'Propositions', 'Criteres'].forEach(function (t) {
          var lignes = json[t] || [];
          if (!lignes.length) return;
          var cols = {};
          sch[t].forEach(function (c) { if (c[0] !== NOM_COLONNE_CONFIG && c[0] !== 'Illustration' && c[1].isFormula !== false) cols[c[0]] = []; });
          lignes.forEach(function (l) {
            Object.keys(cols).forEach(function (k) {
              var v = l[k];
              if (typeof v === 'string' && /^J[+-]\d+$/.test(v)) v = auj + 86400 * (+v.slice(1));
              if (k === 'Image' && v && !/^https?:/.test(v)) v = new URL(v, location.href).href;
              if (v === undefined) v = sch[t].filter(function (c) { return c[0] === k; })[0][1].type === 'Bool' ? false : null;
              cols[k].push(v);
            });
          });
          ex.push(['BulkAddRecord', t, lignes.map(function (l) { return l.id; }), cols]);
        });
        return grist.docApi.applyUserActions(ex);
      });
    }).then(function () {
      etat.alerte = { type: 'success', texte: 'Outil installé.' + (avecExemple ? ' L\'exemple fictif est chargé (sans votes) : supprimez ses lignes quand vous voulez.' : '') };
      return charger();
    }).then(identifier).then(rendre).catch(function (err) {
      etat.alerte = { type: 'error', texte: 'Installation impossible : seuls les propriétaires du document peuvent créer des tables. (' + ((err && err.message) || err) + ')' };
      rendre();
    });
  }

  // ---------------------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------------------

  function cidCourant() { var r = route(); return r.id; }

  function voter(c, pid, mode, sens) {
    var v = monVote(c.id, pid), acts = [], msg = '';
    if (mode === 'soutien') {
      if (v) { acts.push(['RemoveRecord', 'Votes', v.id]); msg = 'Soutien retiré.'; }
      else { acts.push(['AddRecord', 'Votes', null, { Consultation: c.id, Proposition: pid, Valeur: 1 }]); msg = 'Soutien enregistré.'; }
    } else if (mode === 'choix') {
      mesVotes(c.id).forEach(function (x) { acts.push(['RemoveRecord', 'Votes', x.id]); });
      if (!v) acts.push(['AddRecord', 'Votes', null, { Consultation: c.id, Proposition: pid, Valeur: 1 }]);
      msg = v ? 'Choix retiré.' : 'Choix enregistré.';
    } else if (mode === 'points') {
      var mes = v ? nombre(v.Valeur) : 0, reste = budget(c) - pointsUtilises(c);
      if (sens > 0 && (reste <= 0 || mes >= maxParProposition(c))) return;
      if (sens < 0 && !mes) return;
      var n = mes + sens;
      if (!v) acts.push(['AddRecord', 'Votes', null, { Consultation: c.id, Proposition: pid, Valeur: n }]);
      else if (n <= 0) acts.push(['RemoveRecord', 'Votes', v.id]);
      else acts.push(['UpdateRecord', 'Votes', v.id, { Valeur: n }]);
    }
    executer(acts, msg);
  }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('button');
    if (!el || el.disabled) return;
    var a = el.getAttribute('data-action'), c = consultation(cidCourant());
    if (a === 'imprimer') { window.print(); return; }
    if (a === 'enregistrer-reglages') { enregistrerReglages(); return; }
    if (a === 'annuler-reglages') { brouillonReglages = null; location.hash = '#/'; return; }
    if (a === 'annuler-suppression') { etat.suppression = null; rendre(); return; }
    if (el.hasAttribute('data-installer')) { el.disabled = true; installer(el.getAttribute('data-installer') === 'exemple'); return; }
    if (el.hasAttribute('data-soutenir') && c) { voter(c, num(el.getAttribute('data-soutenir')), 'soutien'); return; }
    if (el.hasAttribute('data-choisir') && c) { voter(c, num(el.getAttribute('data-choisir')), 'choix'); return; }
    if (el.hasAttribute('data-points') && c) { voter(c, num(el.getAttribute('data-points')), 'points', num(el.getAttribute('data-sens'))); return; }
    if (el.hasAttribute('data-copier')) {
      var texte = texteResultats(consultation(num(el.getAttribute('data-copier'))));
      (navigator.clipboard ? navigator.clipboard.writeText(texte) : Promise.reject()).then(function () {
        etat.alerte = { type: 'success', texte: 'Résultat copié : collez-le dans un courriel ou un document.' }; rendre();
      }).catch(function () { etat.alerte = { type: 'error', texte: 'Copie impossible depuis ce navigateur. Utilisez « Imprimer ou enregistrer en PDF ».' }; rendre(); });
      return;
    }
    if (el.hasAttribute('data-supprimer-critere')) {
      var crid = num(el.getAttribute('data-supprimer-critere'));
      var acts = data.Votes.filter(function (v) { return num(v.Critere) === crid; }).map(function (v) { return ['RemoveRecord', 'Votes', v.id]; });
      acts.push(['RemoveRecord', 'Criteres', crid]);
      executer(acts, 'Critère supprimé, ainsi que ses notes.');
      return;
    }
    if (el.hasAttribute('data-demander-suppression')) { etat.suppression = 'c' + el.getAttribute('data-demander-suppression'); rendre(); return; }
    if (el.hasAttribute('data-confirmer-suppression')) {
      var cid = num(el.getAttribute('data-confirmer-suppression')), toutes = [];
      ['Votes', 'Criteres', 'Propositions'].forEach(function (t) { data[t].forEach(function (l) { if (num(l.Consultation) === cid) toutes.push(['RemoveRecord', t, l.id]); }); });
      toutes.push(['RemoveRecord', 'Consultations', cid]);
      etat.suppression = null;
      executer(toutes, 'Consultation supprimée.', function () { etat.garderAlerte = true; location.hash = '#/'; });
    }
  });

  app.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-brouillon')) brouillon(el.getAttribute('data-brouillon'))[el.getAttribute('data-champ')] = el.value;
    if (el.getAttribute('data-filtre') === 'q') {
      etat.filtres[num(el.getAttribute('data-c'))].q = el.value;
      clearTimeout(etat.attenteRecherche);
      etat.attenteRecherche = setTimeout(function () {
        rendre();
        var champRecherche = document.getElementById('f-q');
        if (champRecherche) { champRecherche.focus(); champRecherche.setSelectionRange(champRecherche.value.length, champRecherche.value.length); }
      }, 250);
    }
  });

  app.addEventListener('change', function (e) {
    var el = e.target, c = consultation(cidCourant());
    var f = el.getAttribute('data-filtre');
    if (f && f !== 'q') {
      var fl = etat.filtres[num(el.getAttribute('data-c'))];
      fl[f] = el.type === 'checkbox' ? el.checked : el.value;
      rendre(); var x = document.getElementById(el.id); if (x) x.focus();
      return;
    }
    if (el.hasAttribute('data-brouillon') && el.getAttribute('data-champ') === 'Mode') { rendre(); return; }
    if (el.hasAttribute('data-noter') && c) {
      var pid = num(el.getAttribute('data-noter')), crit = num(el.getAttribute('data-critere')), val = num(el.value);
      var v = monVote(c.id, pid, crit);
      var champs = { Consultation: c.id, Proposition: pid, Valeur: val };
      if (crit) champs.Critere = crit;
      executer([v ? ['UpdateRecord', 'Votes', v.id, { Valeur: val }] : ['AddRecord', 'Votes', null, champs]], 'Note enregistrée.').then(function () {
        var r = document.getElementById(el.id); if (r) r.focus();
      });
      return;
    }
    if (el.hasAttribute('data-poids')) { executer([['UpdateRecord', 'Criteres', num(el.getAttribute('data-poids')), { Poids: nombre(el.value) }]], 'Poids enregistré.'); }
  });

  function texte(v) { return String(v === undefined || v === null ? '' : v).trim(); }

  app.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, type = f.getAttribute('data-form'), cid = num(f.getAttribute('data-c')), cle, b;
    if (type === 'depot') {
      cle = 'depot-' + cid; b = brouillon(cle);
      if (!texte(b.Titre) || !texte(b.Description)) { etat.alerte = { type: 'error', texte: 'Indiquez un titre et une description.' }; rendre(); return; }
      var fichier = (document.getElementById('d-image').files || [])[0];
      if (fichier && fichier.size > 2000000) { etat.alerte = { type: 'error', texte: 'Image trop lourde : 2 Mo au plus.' }; rendre(); return; }
      var champs = { Consultation: cid, Titre: texte(b.Titre), Description: texte(b.Description), Type: b.Type || L.types[0], Auteur: texte(b.Auteur), Structure: texte(b.Structure),
        Lien: texte(b.Lien), Statut: L.statuts[0] };
      var image = !fichier ? Promise.resolve(null) : DEMO ? window.PageDSFR.lireImage(fichier, 2000000).then(function (u) { champs.Image = u; }) :
        envoyerPiece(fichier).then(function (id) { champs.Illustration = ['L', id]; });
      image.then(function () {
        return executer([['AddRecord', 'Propositions', null, champs]], 'Merci ! Votre proposition est déposée.', function () { delete etat.brouillons[cle]; etat.garderAlerte = true; location.hash = '#/c/' + cid; });
      }).catch(function (err) { etat.alerte = { type: 'error', texte: 'Dépôt impossible : ' + ((err && err.message) || err) }; rendre(); });
      return;
    }
    if (type === 'suite') {
      var pid = num(f.getAttribute('data-p')); cle = 'suite-' + pid; b = brouillon(cle);
      var p = idx.Propositions[pid], maj = {};
      if (b.Statut !== undefined) maj.Statut = b.Statut;
      if (b.Suite !== undefined) maj.Suite = b.Suite;
      if (!Object.keys(maj).length) { maj.Statut = p.Statut || L.statuts[0]; }
      executer([['UpdateRecord', 'Propositions', pid, maj]], 'Suite enregistrée pour « ' + p.Titre + ' ».', function () { delete etat.brouillons[cle]; });
      return;
    }
    if (type === 'gerer') {
      cle = 'gerer-' + (cid || 'n'); b = brouillon(cle);
      var c = cid ? consultation(cid) : null;
      var titre = b.Titre !== undefined ? texte(b.Titre) : (c ? c.Titre : '');
      if (!titre) { etat.alerte = { type: 'error', texte: 'Indiquez un titre.' }; rendre(); return; }
      var ch = {};
      ['Titre', 'Question', 'Description', 'Mode', 'Phase', 'Resultats'].forEach(function (k) { if (b[k] !== undefined) ch[k] = texte(b[k]); });
      if (b.Echeance !== undefined) ch.Echeance = saisieVersDate(b.Echeance);
      if (b.Points !== undefined) ch.Points = num(b.Points) || 5;
      if (b.Max_par_proposition !== undefined) ch.Max_par_proposition = num(b.Max_par_proposition) || null;
      if (!c) {
        ch = Object.assign({ Mode: MODES[0], Phase: PHASES[0], Resultats: VISIBILITES[0] }, ch);
        if (ch.Mode === 'Vote par points') { ch.Points = ch.Points || 5; ch.Max_par_proposition = ch.Max_par_proposition || 3; }
        ecrire([['AddRecord', 'Consultations', null, ch]]).then(function (res) {
          delete etat.brouillons[cle];
          etat.alerte = { type: 'success', texte: 'Consultation créée. Partagez le document à l\'équipe pour recueillir les propositions.' };
          return (DEMO ? Promise.resolve() : charger()).then(function () { etat.garderAlerte = true; location.hash = '#/c/' + res.retValues[0] + (ch.Mode === 'Notation' ? '/gerer' : ''); });
        }).catch(function (err) { etat.alerte = { type: 'error', texte: 'Création refusée par Grist. (' + ((err && err.message) || err) + ')' }; rendre(); });
        return;
      }
      executer([['UpdateRecord', 'Consultations', cid, ch]], 'Consultation enregistrée.', function () { delete etat.brouillons[cle]; });
      return;
    }
    if (type === 'critere') {
      cle = 'critere-' + cid; b = brouillon(cle);
      if (!texte(b.Nom)) { etat.alerte = { type: 'error', texte: 'Indiquez le nom du critère.' }; rendre(); return; }
      executer([['AddRecord', 'Criteres', null, { Consultation: cid, Nom: texte(b.Nom), Description: texte(b.Description), Poids: nombre(b.Poids) || 1 }]], 'Critère ajouté.', function () { delete etat.brouillons[cle]; });
    }
  });

  window.addEventListener('hashchange', function () {
    if (etat.garderAlerte) etat.garderAlerte = false; else etat.alerte = null;
    etat.suppression = null;
    if (configLab) configLab.onglet(route().vue === 'reglages' ? 'reglages' : 'vue');
    rendre(); window.scrollTo(0, 0);
  });

  app.addEventListener('focusout', function () {
    if (etat.rendreApresSaisie) { etat.rendreApresSaisie = false; setTimeout(rendre, 0); }
  });
  function rendreSiLibre() {
    var a = document.activeElement;
    if (a && app.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { etat.rendreApresSaisie = true; return; }
    rendre();
  }

  // ---------------------------------------------------------------------------
  // Thème
  // ---------------------------------------------------------------------------

  var choixTheme = 'auto';
  try { choixTheme = localStorage.getItem('gd-theme') || 'auto'; } catch (e) { /* stockage indisponible */ }
  function themeGrist() {
    var st = getComputedStyle(document.documentElement);
    var m = (st.getPropertyValue('--grist-theme-page-bg') || st.getPropertyValue('--grist-theme-bg') || '').trim().match(/^#([0-9a-f]{6})$/i);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 < 0.5 ? 'dark' : 'light';
  }
  function appliquerTheme() {
    var t = choixTheme;
    if (t === 'auto') t = themeGrist() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-fr-theme', t);
  }
  var selectTheme = document.getElementById('gd-theme');
  selectTheme.value = choixTheme;
  selectTheme.addEventListener('change', function () {
    choixTheme = selectTheme.value;
    try { localStorage.setItem('gd-theme', choixTheme); } catch (e) { /* stockage indisponible */ }
    appliquerTheme();
  });
  new MutationObserver(appliquerTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  // ---------------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------------

  appliquerTheme();
  function erreurChargement(err) {
    app.innerHTML = '<div class="fr-alert fr-alert--error"><h2 class="fr-alert__title">Chargement impossible</h2>' +
      '<p>Vérifiez que le widget a l\'accès « Accès complet au document ». Détail : ' + esc((err && err.message) || err) + '</p></div>';
  }
  document.getElementById('gd-actualiser').addEventListener('click', function () { charger().then(rendre).catch(erreurChargement); });

  if (DEMO) {
    document.getElementById('gd-demo').hidden = false;
    charger().then(rendre).catch(erreurChargement);
  } else {
    grist.ready({ requiredAccess: 'full', allowSelectBy: true });
    var attente = null, premier = true;
    grist.onRecords(function () {
      clearTimeout(attente);
      attente = setTimeout(function () {
        charger().then(function () {
          if (premier && !tablesManquantes().length) { premier = false; return identifier(); }
          return null;
        }).then(function () { appliquerTheme(); rendreSiLibre(); }).catch(erreurChargement);
      }, 150);
    });
    // Les votes des collègues arrivent dans d'autres tables : relecture régulière.
    setInterval(function () { if (!document.hidden) charger().then(rendreSiLibre).catch(function () {}); }, 30000);
  }
})();
