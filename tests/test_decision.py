"""Tests de bout en bout du mode démonstration : python3 tests/test_decision.py
Variables : CHROME (chemin du navigateur), URL (par défaut http://localhost:8781/)."""
import os, sys
from playwright.sync_api import sync_playwright
URL = os.environ.get('URL', 'http://localhost:8781/')
ok = ko = 0
def verifier(nom, cond):
    global ok, ko
    print(('OK   ' if cond else 'ÉCHEC ') + nom); ok += cond; ko += (not cond)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1280, 'height': 900}); erreurs = []
    pg.on('pageerror', lambda e: erreurs.append(str(e)))
    pg.goto(URL); pg.wait_for_selector('.gd-cartes')
    verifier('accueil : 4 consultations en cours, 1 close', pg.locator('.gd-cartes').first.locator('.fr-card').count() == 4 and pg.locator('.gd-cartes').nth(1).locator('.fr-card').count() == 1)
    # Soutien et images
    pg.goto(URL + '#/c/1'); pg.wait_for_selector('.gd-mur')
    verifier('mur : 5 réalisations, 4 images', pg.locator('.gd-prop').count() == 5 and pg.locator('.gd-prop__image img').count() == 4)
    carte = pg.locator('.gd-prop', has_text='podcast')
    avant = carte.locator('.gd-score').inner_text()
    carte.get_by_role('button', name='Soutenir').click()
    carte = pg.locator('.gd-prop', has_text='podcast')
    verifier('soutenir : bouton pressé et score +1', carte.locator('[aria-pressed=true]').count() == 1 and carte.locator('.gd-score').inner_text() != avant)
    verifier('bandeau : 1 proposition soutenue', 'soutenez 1 proposition' in pg.locator('.gd-reste').inner_text())
    carte.get_by_role('button', name='Soutenue').click()
    verifier('retirer le soutien', pg.locator('.gd-prop', has_text='podcast').locator('[aria-pressed=false]').count() == 1)
    pg.fill('#f-q', 'forum'); pg.wait_for_timeout(400)
    verifier('recherche', pg.locator('.gd-prop').count() == 1)
    # Résultats cachés jusqu'au vote
    pg.goto(URL + '#/c/2'); pg.wait_for_selector('.gd-mur')
    verifier('boîte à idées : résultats cachés avant le vote', pg.locator('.gd-score').count() == 0)
    pg.locator('.gd-prop', has_text='annuaire').get_by_role('button', name='Soutenir').click()
    verifier('résultats visibles après le vote', pg.locator('.gd-score').count() == 7)
    pg.select_option('#f-statut', 'Réalisée')
    verifier('filtre suite donnée', pg.locator('.gd-prop').count() == 1)
    # Vote par points
    pg.goto(URL + '#/c/3'); pg.wait_for_selector('.gd-mur')
    plus = lambda t: pg.locator('.gd-prop', has_text=t).get_by_role('button', name='Ajouter un point')
    for _ in range(3): plus('Accueillir').click()
    verifier('points : plafond de 3 par proposition', plus('Accueillir').is_disabled())
    plus('Simplifier').click(); plus('Simplifier').click()
    verifier('points : budget épuisé', '0 point restant' in pg.locator('.gd-reste').inner_text() and plus('Former').is_disabled())
    pg.locator('.gd-prop', has_text='Simplifier').get_by_role('button', name='Retirer un point').click()
    verifier('points : retirer un point', '1 point restant' in pg.locator('.gd-reste').inner_text())
    verifier('points : résultats cachés jusqu\'à la clôture', pg.locator('.gd-score').count() == 0)
    # Notation
    pg.goto(URL + '#/c/4'); pg.wait_for_selector('.gd-mur')
    pg.locator('.gd-prop', has_text='Outil C').get_by_role('link', name='Évaluer').click()
    pg.wait_for_selector('.gd-notation')
    verifier('notation : 3 critères', pg.locator('.gd-segment').count() == 3)
    for crit in range(3): pg.locator('.gd-segment').nth(crit).locator('label', has_text='5').click()
    verifier('notation : notes enregistrées', pg.locator('.gd-notation input:checked').count() == 3)
    pg.goto(URL + '#/c/4/resultats'); pg.wait_for_selector('.gd-classement')
    verifier('classement : 3 outils avec détail par critère', pg.locator('.gd-classement__ligne').count() == 3 and 'Accessibilité' in pg.locator('.gd-classement').inner_text())
    # Close
    pg.goto(URL + '#/c/5'); pg.wait_for_selector('.gd-mur')
    verifier('consultation close : pas de vote, suite affichée', pg.locator('.gd-prop button').count() == 0 and pg.locator('.gd-prop', has_text='bien-être').locator('.fr-badge', has_text='Retenue').count() == 1)
    # Dépôt
    pg.goto(URL + '#/c/2/deposer'); pg.wait_for_selector('form[data-form=depot]')
    pg.fill('#d-titre', 'Idée de test'); pg.fill('#d-desc', 'Description de test')
    pg.locator('form[data-form=depot] button[type=submit]').click()
    pg.wait_for_selector('.gd-mur'); pg.select_option('#f-statut', '')
    verifier('dépôt : proposition ajoutée', pg.locator('.gd-prop', has_text='Idée de test').count() == 1 and 'déposée' in pg.locator('.gd-alerte').inner_text())
    # Suites
    pg.goto(URL + '#/c/2/resultats'); pg.wait_for_selector('.gd-suite-ligne')
    f = pg.locator('form.gd-suite-ligne', has_text='Idée de test')
    f.locator('select').select_option('Retenue'); f.locator('textarea').fill('Testée en janvier.'); f.locator('button').click()
    pg.goto(URL + '#/c/2'); pg.wait_for_selector('.gd-mur')
    verifier('suite enregistrée', pg.locator('.gd-prop', has_text='Idée de test').locator('.fr-badge', has_text='Retenue').count() == 1)
    # Création
    pg.goto(URL + '#/nouvelle'); pg.fill('#g-titre', 'Consultation de test'); pg.select_option('#g-mode', 'Notation')
    pg.locator('form[data-form=gerer] button[type=submit]').click(); pg.wait_for_selector('form[data-form=critere]')
    pg.fill('#cr-nom', 'Utilité'); pg.locator('form[data-form=critere] button[type=submit]').click()
    verifier('création : consultation et critère', pg.locator('h1', has_text='Consultation de test').count() == 1 and pg.locator('td', has_text='Utilité').count() == 1)
    pg.goto(URL + '#/c/1'); pg.wait_for_selector('.gd-mur'); pg.screenshot(path='/tmp/decision-mur.png', full_page=True)
    pg.goto(URL + '#/c/1/p/2'); pg.wait_for_selector('.gd-fiche'); pg.screenshot(path='/tmp/decision-fiche.png', full_page=True)
    pg.goto(URL + '#/c/3/resultats'); pg.wait_for_selector('h1'); pg.goto(URL + '#/c/2/resultats'); pg.wait_for_selector('.gd-classement'); pg.screenshot(path='/tmp/decision-resultats.png', full_page=True)
    pg.set_viewport_size({'width': 400, 'height': 800}); pg.goto(URL + '#/c/3'); pg.wait_for_selector('.gd-mur'); pg.screenshot(path='/tmp/decision-mobile.png')
    # Aperçu réel : l'outil lui-même sous l'en-tête
    pg.goto(URL); pg.wait_for_selector('.gd-cartes')
    pg.locator('.cl-barre label', has_text='Aperçu').click(); pg.wait_for_timeout(600)
    verifier('aperçu réel : l\'outil est dans le cadre de l\'aperçu', pg.locator('.cl-apercu #gd-app .gd-cartes').count() >= 1)
    pg.locator('.cl-barre label').first.click(); pg.wait_for_timeout(400)
    verifier('aperçu quitté : l\'outil est revenu dans son onglet', pg.locator('.cl-apercu #gd-app').count() == 0 and pg.locator('#gd-app .gd-cartes').count() >= 1)
    verifier('aucune erreur JavaScript', not erreurs)
    if erreurs: print(erreurs)
    b.close()
print(f'{ok} réussis, {ko} échoués'); sys.exit(1 if ko else 0)
