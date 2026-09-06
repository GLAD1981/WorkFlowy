# Handover

## 2026-09-04 — routage History vers les films

- Le loader public `userscripts/loader.user.js` est la source distribuée à
  Tampermonkey, via son URL stable `.../WorkFlowy/main/userscripts/loader.user.js`.
- Le routeur lit l'arbre natif `WF` toutes les 500 ms, sans dépendre uniquement
  des mutations DOM. Les essais réels de la version 2.2.8 ont toutefois échoué :
  `window.WF` est absent dans le userscript, alors que `WF` est disponible dans
  le monde principal (comme dans la console WorkFlowy).
- La version 2.2.9 force le bac à sable Tampermonkey `raw` et privilégie le
  symbole direct `WF`, avec repli sur `unsafeWindow.WF`.
- La source surveillée est directement `🎥 history` (`cb6bcd3bf1ba`) : tout
  nouvel enfant feuille est déplacé vers son année et son mois. Les dossiers
  créés par le routeur sont exclus du flux pour empêcher toute récursion.
- Après déplacement, le routeur étend `history`, l'année et le mois, puis met
  le nœud déplacé en édition : le curseur reste actif, sans zoom ni sélection
  globale qui ouvrirait le menu de formatage.
- Les nouvelles années et nouveaux mois sont insérés au premier rang de leur
  parent : la hiérarchie est antéchronologique, sans modifier l'ordre existant.
- Le test de régression est `userscripts/loader.test.cjs`, à lancer avec
  `node --test userscripts/loader.test.cjs`. Il vérifie l'ajout d'un enfant de
  `🎥 history` sans mutation DOM, puis son déplacement vers `🎥 [ 2026 ]
  > 🎥 [ 09/2026 ]` avec une date Europe/Paris.
- Le test couvre aussi le cas `WF` direct / `unsafeWindow.WF` absent, le
  routage sans Inbox, l'exclusion des dossiers générés, l'expansion de la
  hiérarchie et l'édition du nœud. La mise à jour porte la version Tampermonkey
  à `2.4.1` afin de déclencher la
  mise à jour automatique.

## 2026-09-06 — menu compact

- Version du loader : `2.5.0`.
- Le menu WorkFlowy est désormais vertical, placé en haut à droite, et ne
  conserve que le bouton `Recycle` et son état temporaire.
- Les boutons `Configurer` et `Action HA`, ainsi que leur panneau et leur
  stockage Home Assistant, ont été supprimés. Les boutons n'ont plus de
  liséré permanent.
- `GM.xmlHttpRequest` est conservé pour l'étape météo suivante, avec accès
  autorisé à `api.open-meteo.com`.
- Validation : `node --test userscripts/loader.test.cjs` — PASS (1 test).

## 2026-09-06 — note météo Paris

- Version du loader : `2.6.0`.
- Le nœud `5989c44498ec` reçoit automatiquement une note avec la maximale,
  la minimale et la probabilité maximale de pluie du lendemain à Paris
  (`48.8566, 2.3522`).
- La requête utilise l'API Forecast Open-Meteo, le paramètre
  `timezone=Europe/Paris` et les agrégats quotidiens natifs. Elle passe par
  `GM.xmlHttpRequest`, sans lecture du DOM.
- La note est actualisée au plus une fois par jour et le mécanisme reste
  capable de détecter un nœud météo apparu après le chargement.
- Validation : `node --test userscripts/loader.test.cjs` — PASS (2 tests).

## 2026-09-06 — export Microsoft To Do

- Version du loader : `2.7.0`.
- Sur `to-do.live.com`, un bouton `Copier pour WorkFlowy` extrait les tâches
  visibles, déduplique les lignes et les place dans le presse-papiers sous
  forme de lignes WorkFlowy.
- Ce mode volontairement local ne dépend pas d'un jeton Todo ni d'une API
  externe : après copie, il suffit de coller dans le nœud WorkFlowy voulu.
- Validation : `node --test userscripts/loader.test.cjs` — PASS (3 tests).

## 2026-09-06 — recycle mode app et message temporaire

- Version du loader : `2.8.0`.
- Recycle accepte désormais `WF.rootItem` sous forme de fonction ou d'objet,
  et fonctionne sans `WF.editGroup` en appelant directement `completeItem`.
- Le message global WorkFlowy, qui restait affiché, a été supprimé : le
  compteur est affiché uniquement dans le menu pendant quatre secondes.
- Validation : `node --test userscripts/loader.test.cjs` — PASS (4 tests).

## 2026-09-06 — plage horaire météo

- Version du loader : `3.0.0`.
- De `05:00` inclus à `19:00` exclus, heure Europe/Paris, la note prend la
  météo du jour. Le reste du temps, elle prend celle du lendemain.
- Validation : `node --test userscripts/loader.test.cjs` — PASS (5 tests),
  avec scénarios de journée et de soirée.

## 2026-09-06 — recherche des items focalisés

- Version du loader : `3.1.0`.
- Le loader surveille les enfants directs de `655fd6cd4671`. Si l'item
  focalisé se trouve au-dessus des deux repères `dcb74de21aaa` et
  `0d1b418a6d43`, ses mots sont recherchés dans ce parent avec `OR`.
- Chaque mot est dédupliqué, nettoyé et privé de son `s` terminal. Si les
  éléments masqués sont désactivés, `toggleCompletedVisible()` est appelé
  avant la recherche. Le même item et la même requête ne sont pas relancés
  en boucle.
- Validation : `node --test userscripts/loader.test.cjs` — PASS (6 tests).

## 2026-09-06 — correction du focus et du périmètre de recherche

- Version du loader : `3.2.0`.
- WorkFlowy expose l'item réellement focalisé via `WF.focusedItem()`, tandis
  que `WF.currentItem()` désigne le contexte courant. Le déclencheur utilise
  désormais `focusedItem()` en priorité.
- La recherche est limitée au parent demandé par `WF.zoomTo(parent)` puis
  `WF.search(query)`, conformément à la signature native observée dans
  `mylib.js`.
- Validation locale : `node --test userscripts/loader.test.cjs` — PASS
  (6 tests).

## 2026-09-06 — libellé météo relatif

- Version du loader : `2.9.0`.
- La note météo ne commence plus par `Météo Paris —` et n'affiche plus la
  date numérique : elle utilise `demain <jour>` ou `aujourd'hui <jour>` selon
  la date Europe/Paris.
- Validation : `node --test userscripts/loader.test.cjs` — PASS (4 tests).
