// Version ultra-minimaliste du toggle de langue EN <-> FR
(async () => {
  // Basculer la langue
  const newLang = game.i18n.lang === "en" ? "fr" : "en";
  ui.notifications.info(`Changement de langue: ${game.i18n.lang} → ${newLang}`);
  
  // Changer la langue dans les paramètres et recharger les traductions
  await game.settings.set("core", "language", newLang);
  await game.i18n.setLanguage(newLang);
  
  // Rafraîchir toutes les applications ouvertes
  Object.values(ui.windows).forEach(app => app.render?.(true));
  
  // Rafraîchir l'interface principale
  ui.sidebar?.render(true);
  ui.controls?.render(true);
})();