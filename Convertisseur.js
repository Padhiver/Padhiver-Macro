// Fonction de conversion
function feetToMeters(feet) {
  return (feet / 5) * 1.5;
}

function metersToFeet(meters) {
  return (meters / 1.5) * 5;
}

// Section CSS modifiable
const customStyles = `
/* Styles spécifiques à la fenêtre de conversion */

#converter-window {
  border: var(--dnd5e-border-gold);
  background: url(systems/dnd5e/ui/texture-gray1.webp) no-repeat top left, 
              url(systems/dnd5e/ui/texture-gray2.webp) no-repeat bottom right, 
              var(--dnd5e-color-parchment);
}

#converter-window h2 {
  text-align: center;
  font-size: var(--font-size-32);
  font-family: var(--dnd5e-font-modesto);
  font-weight: bold;
  border: none;
  text-align: left;
}

#converter-window img {
  border: none;
}

#converter-window .window-header {
  flex-wrap: nowrap;
  background: transparent; /* Fond transparent pour hériter du parent */
  position: relative;
  z-index: 1;
  border: none;
  align-items: center;
  padding: 10px; /* Ajoutez un peu de padding pour l'esthétique */
  color: black;
}

#converter-window .window-content {
  background: transparent; /* Fond transparent pour hériter du parent */
  padding: 10px; /* Ajoutez un peu de padding pour l'esthétique */
}

#converter-window input[type="number"] {
  border: 1px solid #ccc;
  padding: 5px;
  border-radius: 4px;
}

#converter-window button.preset {
  border-radius: 4px;
  background: var(--dnd5e-background-card);
  box-shadow: 0 0 6px var(--dnd5e-shadow-45);
  border: var(--dnd5e-border-gold);
  cursor: pointer;
  color: black;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Animation au survol des boutons */
#converter-window button.preset:hover {
  transform: scale(1.1); /* Agrandissement */
  box-shadow: 0 0 12px var(--dnd5e-shadow-60); /* Ombre plus prononcée */
}

/* Option de survol avec une petite rotation */
#converter-window button.preset:active {
  transform: scale(1.05) rotate(3deg);
}

.ampersand {
border: none;
border-top: 1px solid #9f9275; /* Ajoute un trait doré de 2px */
margin: 10px 0; /* Un peu d'espace autour du trait */
}



`;

// Classe de la fenêtre Convertisseur
class ConverterWindow extends Application {
constructor() {
  super();
}

static get defaultOptions() {
  return foundry.utils.mergeObject(super.defaultOptions, {
    id: 'converter-window', // ID unique pour la fenêtre
    width: 400,
    height: 'auto',
    title: 'Conversion rapide',
  });
}

// Redéfinition de _renderInner pour injecter directement le contenu HTML
async _renderInner() {
  const content = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <img src="https://cdn.discordapp.com/attachments/1181526285323862107/1331589901761908756/Ampersand_Transparent_FR.png?ex=6798c2bc&is=6797713c&hm=01e9b2b49052b8d3791c06ecd1a7f6ca5cec4fc37e786d745e4717d3bb089af4&" alt="Icon" width="96" height="96"/>
      <div>
        <h2>Conversion rapide</h2>
        <p>Inscrivez un nombre et la conversion sera effectuée automatiquement.</p>
      </div>
    </div>
    <hr class="ampersand">
    <div>
      <label for="meters">Mètres :</label>
      <input type="number" id="meters" placeholder="Indiquez la valeur en mètres" style="width: 100%;" />
    </div>
    <div>
      <label for="feet">Pieds :</label>
      <input type="number" id="feet" placeholder="Indiquez la valeur en pieds" style="width: 100%;" />
    </div>
    <div>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button type="button" class="preset" data-feet="5">5f</button>
        <button type="button" class="preset" data-feet="10">10f</button>
        <button type="button" class="preset" data-feet="20">20f</button>
        <button type="button" class="preset" data-feet="30">30f</button>
        <button type="button" class="preset" data-feet="60">60f</button>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button type="button" class="preset" data-feet="90">90f</button>
        <button type="button" class="preset" data-feet="100">100f</button>
        <button type="button" class="preset" data-feet="120">120f</button>
        <button type="button" class="preset" data-feet="150">150f</button>
        <button type="button" class="preset" data-feet="300">300f</button>
      </div>
    </div>
  `;
  return $(content); // Retourne le contenu HTML sous forme de jQuery object
}

// Activation des écouteurs d'événements
activateListeners(html) {
  super.activateListeners(html);

  // Récupération des éléments d'entrée
  let metersInput = html.find("#meters")[0];
  let feetInput = html.find("#feet")[0];

  // Gestion de l'événement quand la valeur des mètres change
  metersInput.addEventListener("input", (event) => {
      let meters = parseFloat(event.target.value);
      if (!isNaN(meters)) {
          feetInput.value = metersToFeet(meters).toFixed(2);
      }
  });

  // Gestion de l'événement quand la valeur des feet change
  feetInput.addEventListener("input", (event) => {
      let feet = parseFloat(event.target.value);
      if (!isNaN(feet)) {
          metersInput.value = feetToMeters(feet).toFixed(2);
      }
  });

  // Gestion des boutons presets
  html.find(".preset").on("click", (event) => {
      let feetValue = parseFloat(event.currentTarget.getAttribute("data-feet"));
      if (!isNaN(feetValue)) {
          feetInput.value = feetValue;
          metersInput.value = feetToMeters(feetValue).toFixed(2);
      }
  });
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
let converterWindow = new ConverterWindow();
converterWindow.render(true);