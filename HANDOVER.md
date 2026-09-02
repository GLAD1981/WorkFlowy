# Handover

## 2026-09-02 — routage Inbox vers les films

- Le loader public `userscripts/loader.user.js` est la source distribuée à
  Tampermonkey, via son URL stable `.../WorkFlowy/main/userscripts/loader.user.js`.
- Le routeur ne dépend plus seulement des mutations DOM : il lit l'arbre natif
  `WF` toutes les 500 ms. Cela couvre les ajouts WorkFlowy non matérialisés dans
  le DOM et le cas où `WF` devient disponible après le lancement du userscript.
- Le test de régression est `userscripts/loader.test.cjs`, à lancer avec
  `node --test userscripts/loader.test.cjs`. Il vérifie l'ajout d'un enfant de
  l'Inbox sans mutation DOM, puis son déplacement vers `🎥 history > 🎥 [ 2026 ]
  > 🎥 [ 09/2026 ]` avec une date Europe/Paris.
- La mise à jour porte la version Tampermonkey à `2.2.8` afin de déclencher la
  mise à jour automatique.
