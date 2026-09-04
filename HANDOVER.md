# Handover

## 2026-09-03 — routage Inbox vers les films

- Le loader public `userscripts/loader.user.js` est la source distribuée à
  Tampermonkey, via son URL stable `.../WorkFlowy/main/userscripts/loader.user.js`.
- Le routeur lit l'arbre natif `WF` toutes les 500 ms, sans dépendre uniquement
  des mutations DOM. Les essais réels de la version 2.2.8 ont toutefois échoué :
  `window.WF` est absent dans le userscript, alors que `WF` est disponible dans
  le monde principal (comme dans la console WorkFlowy).
- La version 2.2.9 force le bac à sable Tampermonkey `raw` et privilégie le
  symbole direct `WF`, avec repli sur `unsafeWindow.WF`. C'est le correctif
  minimal correspondant au diagnostic ; il reste à le valider sur une session
  WorkFlowy connectée avec un nouvel enfant de l'Inbox.
- Le dossier `🎥 history` est désormais déterminé par `Inbox.getParent()` : son
  identifiant n'est donc pas codé en dur. Après déplacement, le routeur étend
  `history`, l'année et le mois, puis sélectionne le nœud déplacé : son bullet
  reste visible, sans changement de zoom.
- Les nouvelles années et nouveaux mois sont insérés au premier rang de leur
  parent : la hiérarchie est antéchronologique, sans modifier l'ordre existant.
- Le test de régression est `userscripts/loader.test.cjs`, à lancer avec
  `node --test userscripts/loader.test.cjs`. Il vérifie l'ajout d'un enfant de
  l'Inbox sans mutation DOM, puis son déplacement vers `🎥 history > 🎥 [ 2026 ]
  > 🎥 [ 09/2026 ]` avec une date Europe/Paris.
- Le test couvre aussi le cas `WF` direct / `unsafeWindow.WF` absent, le parent
  dynamique de l'Inbox, l'expansion de la hiérarchie et la sélection du nœud.
  La mise à jour porte la version Tampermonkey à `2.3.2` afin de déclencher la
  mise à jour automatique.
