class WebViewWindow extends foundry.applications.api.ApplicationV2 {
    /** @override */
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        width: window.innerWidth * 0.9,
        height: window.innerHeight * 0.9,
        title: 'Aide de jeu D&D 2024',
        resizable: true
      });
    }
  
    /** @override */
    async _renderHTML(data, options) {
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      
      div.innerHTML = `
        <iframe 
          src="https://padhiver.github.io/" 
          width="600px" 
          height="600px" 
          style="border: none;">
        </iframe>
      `;
  
      return [div];
    }
  
    /** @override */
    _replaceHTML(result, content, options) {
      content.replaceChildren(...result);
    }
  }
  
  // Instancier et afficher la fenêtre
  new WebViewWindow().render({force: true});