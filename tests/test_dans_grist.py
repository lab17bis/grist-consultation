"""Test « dans Grist » de grist-consultation, avec une API Grist simulée (tests/grist-mock.js) chargée dans tests/hote.html.
Lancer un serveur à la racine du dépôt (python3 -m http.server PORT), puis : PORT=… python3 tests/test_dans_grist.py"""
import os, sys, json
from playwright.sync_api import sync_playwright
ok = ko = 0
def verifier(nom, cond):
    global ok, ko
    print(('OK   ' if cond else 'ÉCHEC ') + nom); ok += cond; ko += (not cond)
def ouvrir(b, port, mock, erreurs, init=None):
    pg = b.new_page(viewport={'width': 1280, 'height': 860})
    if init: pg.add_init_script(init)
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    mockjs = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'grist-mock.js')).read()
    pg.route('https://docs.getgrist.com/grist-plugin-api.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mockjs))
    pg.route('https://data.geopf.fr/wmts**', lambda r: r.fulfill(status=204))
    pg.route('https://data.geopf.fr/geocodage/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'features': [{'geometry': {'coordinates': [3.72, 48.72]}, 'properties': {'score': 0.9}}]})))
    pg.goto(f'http://localhost:{os.environ.get("PORT", port)}/tests/hote.html')
    pg.evaluate('m => { window.MOCK = m; charger(); }', mock)
    return pg, pg.frame_locator('#w')
mock = lambda pg: pg.evaluate('window.MOCK')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
    erreurs = []
    # --- grist-consultation : installation, identification, vote, rechargement
    m = {'tables': {'Table1': {'colonnes': {'A': {'type': 'Text'}}, 'lignes': []}}, 'table': 'Table1', 'utilisateur': {'email': 'agent@exemple.fr', 'nom': 'Agent Test'}}
    pg, f = ouvrir(b, 8781, m, erreurs)
    f.get_by_role('button', name='Créer les tables avec un exemple fictif').click()
    f.locator('.gd-cartes').first.wait_for()
    d = mock(pg)
    verifier('decision : tables créées et exemple chargé sans votes', all(t in d['tables'] for t in ['Consultations', 'Propositions', 'Criteres', 'Votes', 'Votants']) and len(d['tables']['Propositions']['lignes']) == 23 and not d['tables']['Votes']['lignes'])
    verifier('decision : personne identifiée (table Votants)', [v['Email'] for v in d['tables']['Votants']['lignes']] == ['agent@exemple.fr'])
    pg.frame_locator('#w').locator('a', has_text='Boîte à idées').click()
    f.locator('.gd-mur').wait_for()
    f.locator('.gd-prop', has_text='annuaire').get_by_role('button', name='Soutenir').click()
    f.locator('.gd-prop', has_text='annuaire').locator('[aria-pressed=true]').wait_for()
    v = mock(pg)['tables']['Votes']['lignes']
    verifier('decision : vote enregistré avec l\'adresse de la personne', len(v) == 1 and v[0]['Votant'] == 'agent@exemple.fr' and v[0]['Valeur'] == 1)
    doc = mock(pg)['tables']; pg.close()
    m2 = dict(m, tables=doc)
    pg, f = ouvrir(b, 8781, m2, erreurs)
    f.locator('.gd-cartes').first.wait_for(); pg.wait_for_timeout(300)
    verifier('decision : pas de nouvelle identification au rechargement', len(mock(pg)['tables']['Votants']['lignes']) == 1)
    doc = mock(pg)['tables']; pg.close()
    # Ordinateur partagé : le navigateur garde l'identité d'agent@, mais c'est collegue@ qui est connecté.
    doc['Votants']['lignes'].append({'id': 99, 'Email': 'collegue@exemple.fr', 'Nom': 'Collègue'})
    m3 = dict(m, tables=doc, utilisateur={'email': 'collegue@exemple.fr', 'nom': 'Collègue'})
    pg, f = ouvrir(b, 8781, m3, erreurs, "try { localStorage.setItem('gd-moi-doc-test', JSON.stringify({ email: 'agent@exemple.fr', nom: 'Agent Test' })); } catch (e) {}")
    pg.wait_for_timeout(300)
    f.locator('a', has_text='Boîte à idées').click(); f.locator('.gd-mur').wait_for()
    # Avec l'identité gardée, le soutien d'agent@ apparaît comme « le mien » : cliquer le retirerait.
    f.locator('.gd-prop', has_text='annuaire').locator('[aria-pressed=true]').click()
    pg.wait_for_timeout(800)
    v = mock(pg)['tables']['Votes']['lignes']
    verifier('ordinateur partagé : le vote d\'agent@ n\'est pas retiré par collegue@', any(x['Votant'] == 'agent@exemple.fr' for x in v))
    verifier('ordinateur partagé : message « la personne connectée a changé »', 'personne connectée a changé' in f.locator('body').inner_text())
    pg.close()
    # --- Vote public contrôlé : seuls comptent les votes par code validés par Grist ; les anonymes sans code sont ignorés
    m4 = {'tables': {'Table1': {'colonnes': {'A': {'type': 'Text'}}, 'lignes': []}}, 'table': 'Table1', 'utilisateur': {'email': 'agent@exemple.fr', 'nom': 'Agent Test'}}
    pg, f = ouvrir(b, 8781, m4, erreurs)
    f.get_by_role('button', name='Créer les tables avec un exemple fictif').click()
    f.locator('.gd-cartes').first.wait_for()
    doc = mock(pg)['tables']; pg.close()
    cid = doc['Consultations']['lignes'][0]['id']
    pids = [x['id'] for x in doc['Propositions']['lignes'] if x['Consultation'] == cid][:2]
    doc['Votes']['colonnes']['Code'] = {'type': 'Text'}
    doc['Votes']['colonnes']['Bulletin'] = {'type': 'Int', 'isFormula': True, 'formula': 'x'}
    doc['Votes']['colonnes']['Valide'] = {'type': 'Bool', 'isFormula': True, 'formula': 'x'}
    doc['Votes']['lignes'] = [
        {'id': 1, 'Consultation': cid, 'Proposition': pids[0], 'Valeur': 1, 'Votant': 'anon@getgrist.com', 'Code': 'AAAABBBB', 'Bulletin': 1, 'Valide': True},
        {'id': 2, 'Consultation': cid, 'Proposition': pids[0], 'Valeur': 1, 'Votant': 'anon@getgrist.com', 'Code': 'AAAABBBB', 'Bulletin': 1, 'Valide': False},
        {'id': 3, 'Consultation': cid, 'Proposition': pids[0], 'Valeur': 1, 'Votant': 'anon@getgrist.com', 'Code': 'ZZZZZZZZ', 'Bulletin': 0, 'Valide': False},
        {'id': 4, 'Consultation': cid, 'Proposition': pids[0], 'Valeur': 1, 'Votant': 'anon@getgrist.com', 'Code': '', 'Bulletin': 0, 'Valide': False},
        {'id': 5, 'Consultation': cid, 'Proposition': pids[1], 'Valeur': 1, 'Votant': 'collegue@exemple.fr'}]
    doc['Consultations']['lignes'][0]['Resultats'] = 'Toujours'
    pg, f = ouvrir(b, 8781, dict(m4, tables=doc), erreurs)
    f.locator('.gd-cartes').first.wait_for(); pg.wait_for_timeout(300)
    texte = f.locator('body').inner_text()
    verifier('vote par code : 2 participants (1 code valide + 1 personne connectée) ; doublon, code inconnu et anonyme sans code ignorés', '2 participants' in texte)
    pg.close()
    # --- Champs supplémentaires des propositions : formulaire de dépôt, enregistrement dans la colonne, fiche
    m5 = {'tables': {'Table1': {'colonnes': {'A': {'type': 'Text'}}, 'lignes': []}}, 'table': 'Table1', 'utilisateur': {'email': 'agent@exemple.fr', 'nom': 'Agent Test'}}
    pg, f = ouvrir(b, 8781, m5, erreurs)
    f.get_by_role('button', name='Créer les tables avec un exemple fictif').click()
    f.locator('.gd-cartes').first.wait_for()
    doc = mock(pg)['tables']; pg.close()
    doc['Propositions']['colonnes']['Budget_estime'] = {'type': 'Text'}
    cfg = {'champsPerso': [{'id': 'Budget_estime', 'label': 'Budget estimé', 'type': 'court', 'requis': True, 'choix': []}, {'id': 'Colonne_absente', 'label': 'Fantôme', 'type': 'court', 'requis': False, 'choix': []}]}
    doc['Consultations']['colonnes']['Config_consultation'] = {'type': 'Text', 'description': json.dumps(cfg)}
    pg, f = ouvrir(b, 8781, dict(m5, tables=doc), erreurs)
    f.locator('.gd-cartes').first.wait_for()
    f.locator('.gd-cartes a').first.click()
    f.get_by_role('link', name='Déposer').first.click() if f.get_by_role('link', name='Déposer').count() else f.get_by_role('button', name='Déposer').first.click()
    f.locator('#d-titre').wait_for()
    verifier('champs supplémentaires : le champ dont la colonne existe est proposé, pas celui dont la colonne manque', f.locator('#d-Budget_estime').count() == 1 and f.locator('#d-Colonne_absente').count() == 0)
    f.locator('#d-titre').fill('Idée avec budget'); f.locator('#d-desc').fill('Une description.')
    f.get_by_role('button', name='Déposer la proposition').click()
    pg.wait_for_timeout(500)
    verifier('champs supplémentaires : un champ obligatoire vide bloque le dépôt', 'Budget estimé' in f.locator('body').inner_text() and not any(x.get('Titre') == 'Idée avec budget' for x in mock(pg)['tables']['Propositions']['lignes']))
    f.locator('#d-Budget_estime').fill('1200 euros')
    f.get_by_role('button', name='Déposer la proposition').click()
    pg.wait_for_timeout(800)
    dep = [x for x in mock(pg)['tables']['Propositions']['lignes'] if x.get('Titre') == 'Idée avec budget']
    verifier('champs supplémentaires : la valeur est enregistrée dans la colonne', len(dep) == 1 and dep[0].get('Budget_estime') == '1200 euros')
    pg.close()
    # --- Réglages : ajout d'un champ de proposition, colonne créée à l'enregistrement
    pg, f = ouvrir(b, 8781, m5, erreurs)
    f.get_by_role('button', name='Créer les tables avec un exemple fictif').click(); f.locator('.gd-cartes').first.wait_for()
    f.locator('.cl-barre .cl-onglets label', has_text='Réglages').click()
    f.locator('#nc-label').wait_for()
    f.locator('#nc-label').fill('Public concerné'); f.locator('#nc-type').select_option('choix')
    f.locator('#nc-choix').fill('Élèves\nFamilles')
    f.get_by_role('button', name='Ajouter ce champ').click()
    f.get_by_text('colonne Public_concerne').wait_for()
    f.get_by_role('button', name='Enregistrer').first.click()
    pg.wait_for_timeout(800)
    cols = mock(pg)['tables']['Propositions']['colonnes']
    verifier('réglages : colonne du champ « Choix » créée avec ses valeurs', 'Public_concerne' in cols and 'Familles' in (cols['Public_concerne'].get('widgetOptions') or ''))
    pg.close()
    # --- Niveaux d'identification du vote public : activation, changement de niveau, code commun
    pg, f = ouvrir(b, 8781, m5, erreurs)
    f.get_by_role('button', name='Créer les tables avec un exemple fictif').click(); f.locator('.gd-cartes').first.wait_for()
    f.locator('.cl-barre .cl-onglets label', has_text='Réglages').click()
    f.get_by_role('button', name='Activer le contrôle du vote').click()
    f.locator('#vc-niveau').wait_for()
    d = mock(pg)['tables']
    verifier('niveaux : colonnes Identification, Courriel, Bulletin (texte) et table des codes créées',
             'Identification' in d['Consultations']['colonnes'] and 'Courriel' in d['Votes']['colonnes'] and d['Votes']['colonnes']['Bulletin']['type'] == 'Text' and 'Codes_vote' in d)
    verifier('niveaux : les cinq niveaux sont proposés', f.locator('#vc-niveau option').count() == 5)
    f.locator('#vc-niveau').select_option('Code commun')
    f.get_by_role('button', name='Créer le code commun').wait_for()
    verifier('niveaux : niveau enregistré sur la consultation', mock(pg)['tables']['Consultations']['lignes'][0].get('Identification') == 'Code commun')
    f.get_by_role('button', name='Créer le code commun').click()
    f.locator('.gd-code').wait_for()
    cc = [x for x in mock(pg)['tables']['Codes_vote']['lignes'] if x.get('Destinataire') == 'Code commun']
    verifier('code commun : une ligne dédiée, 8 caractères', len(cc) == 1 and len(cc[0]['Code']) == 8)
    f.get_by_role('button', name='Changer le code commun').click(); pg.wait_for_timeout(300)
    verifier('code commun : changé sans doublon de ligne', len([x for x in mock(pg)['tables']['Codes_vote']['lignes'] if x.get('Destinataire') == 'Code commun']) == 1)
    f.locator('#vc-niveau').select_option('Courriel déclaré'); pg.wait_for_timeout(300)
    verifier('courriel déclaré : consigne et limite affichées', 'Courriel (obligatoire)' in f.locator('body').inner_text() and 'pas vérifiée' in f.locator('body').inner_text())
    f.locator('#vc-niveau').select_option('Code individuel'); pg.wait_for_timeout(300)
    f.locator('#vc-nombre').fill('3'); f.get_by_role('button', name='Créer les codes').click(); pg.wait_for_timeout(500)
    verifier('code individuel : trois codes créés, sans toucher au code commun', len([x for x in mock(pg)['tables']['Codes_vote']['lignes'] if x.get('Destinataire') != 'Code commun']) == 3)
    pg.close()
    # Mise à jour d'un contrôle installé avant les niveaux (Bulletin numérique)
    pg, f = ouvrir(b, 8781, m5, erreurs)
    f.get_by_role('button', name='Créer les tables avec un exemple fictif').click(); f.locator('.gd-cartes').first.wait_for()
    doc = mock(pg)['tables']; pg.close()
    doc['Votes']['colonnes']['Code'] = {'type': 'Text'}
    doc['Votes']['colonnes']['Bulletin'] = {'type': 'Int', 'isFormula': True, 'formula': 'ancienne'}
    doc['Votes']['colonnes']['Valide'] = {'type': 'Bool', 'isFormula': True, 'formula': 'x'}
    doc['Codes_vote'] = {'colonnes': {'Consultation': {'type': 'Ref:Consultations'}, 'Destinataire': {'type': 'Text'}, 'Code': {'type': 'Text'}}, 'lignes': []}
    pg, f = ouvrir(b, 8781, dict(m5, tables=doc), erreurs)
    f.locator('.gd-cartes').first.wait_for()
    f.locator('.cl-barre .cl-onglets label', has_text='Réglages').click()
    f.get_by_role('button', name='Mettre à jour le contrôle du vote').click()
    f.locator('#vc-niveau').wait_for()
    d = mock(pg)['tables']
    verifier('mise à jour : Bulletin devient du texte avec la nouvelle formule, sans perdre les colonnes', d['Votes']['colonnes']['Bulletin']['type'] == 'Text' and 'Codes_vote' in d['Votes']['colonnes']['Bulletin']['formula'] and 'Courriel' in d['Votes']['colonnes'])
    pg.close()
    verifier('aucune erreur JavaScript', not erreurs)
    if erreurs: print(erreurs)
    b.close()
print(f'{ok} réussis, {ko} échoués'); sys.exit(1 if ko else 0)
