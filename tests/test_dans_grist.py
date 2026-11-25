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
    verifier('aucune erreur JavaScript', not erreurs)
    if erreurs: print(erreurs)
    b.close()
print(f'{ok} réussis, {ko} échoués'); sys.exit(1 if ko else 0)
