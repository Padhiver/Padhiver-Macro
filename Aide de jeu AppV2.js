class WebViewWindow extends foundry.applications.api.ApplicationV2 {
    /** @override */
    static DEFAULT_OPTIONS = {
        id: "webview-window",
        tag: "div",
        window: {
            title: "Aide de jeu D&D 2024",
            resizable: true,
            minimizable: true,
            maximizable: true
        },
        position: {
            width: 760,
            height: 820
        }
    };

    /** @override */
    async _renderHTML(data, options) {
        const container = document.createElement('div');

        const iframe = document.createElement('iframe');
        iframe.src = 'https://padhiver.github.io/';
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            display: block;
            position: absolute;
            top: 0;
            left: 0;
        `;

        container.appendChild(iframe);
        return [container];
    }

    /** @override */
    _replaceHTML(result, content, options) {
        content.replaceChildren(...result);
        this._iframe = content.querySelector('iframe');
    }
}

const webView = new WebViewWindow();
webView.render({ force: true });
