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
- Le test de régression est `userscripts/loader.test.cjs`, à lancer avec
  `node --test userscripts/loader.test.cjs`. Il vérifie l'ajout d'un enfant de
  l'Inbox sans mutation DOM, puis son déplacement vers `🎥 history > 🎥 [ 2026 ]
  > 🎥 [ 09/2026 ]` avec une date Europe/Paris.
- Le test couvre aussi le cas `WF` direct / `unsafeWindow.WF` absent. La mise à
  jour porte la version Tampermonkey à `2.2.9` afin de déclencher la
  mise à jour automatique.
