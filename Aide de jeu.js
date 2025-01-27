// Section CSS modifiable
const customStyles = `
/* Styles spécifiques à la fenêtre de visualisation web */

#webview-window {
  border: var(--dnd5e-border-gold);
  background: url(systems/dnd5e/ui/texture-gray1.webp) no-repeat top left, 
              url(systems/dnd5e/ui/texture-gray2.webp) no-repeat bottom right, 
              var(--dnd5e-color-parchment);
}

#webview-window .window-header {
  flex-wrap: nowrap;
  background: transparent; /* Fond transparent pour hériter du parent */
  position: relative;
  z-index: 1;
  border: none;
  align-items: center;
  padding: 10px; /* Ajoutez un peu de padding pour l'esthétique */
  color: black;
}

#webview-window .window-content {
  background: transparent; /* Fond transparent pour hériter du parent */
  padding: 10px; /* Ajoutez un peu de padding pour l'esthétique */
}

#webview-window iframe {
  border: none;
  width: 100%;
  height: 100%;
}

#webview-window .window-header h4 {
  text-align: center;
  size: 4rem;
}


`;

// Classe de la fenêtre WebView
class WebViewWindow extends Application {
  constructor() {
    super();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'webview-window', // ID unique pour la fenêtre
      width: 800, // Largeur de la fenêtre
      height: 600, // Hauteur de la fenêtre
      title: 'Aide de jeu D&D 2024', // Titre de la fenêtre
      template: '', // Pas de template spécifique
    });
  }

  // Redéfinition de _renderInner pour injecter directement le contenu HTML
  async _renderInner() {
    const content = `
      <div style="width: 100%; height: 100%;">
        <iframe 
          src="https://padhiver.github.io/" 
          width="100%" 
          height="100%" 
          style="border: none;">
        </iframe>
      </div>
    `;
    return $(content); // Retourne le contenu HTML sous forme de jQuery object
  }

  // Redéfinition de la méthode render pour appliquer le style personnalisé
  async render(force = false, options = {}) {
    await super.render(force, options);

    // Ajouter le style dynamiquement
    const styleElement = document.createElement("style");
    styleElement.innerHTML = customStyles;
    document.head.appendChild(styleElement);
  }
}

// Affichage de la fenêtre
let webViewWindow = new WebViewWindow();
webViewWindow.render(true);