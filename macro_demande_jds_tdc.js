/**
 * Macro sélecteur utilisant DialogV2 avec des boutons radio pour choisir entre deux macros
 * Il suffit de remplacer les ID par ceux de vos macros existantes
 */

// Remplacez ces ID par ceux de vos macros existantes
const SKILL_CHECK_MACRO_ID = "OeaWothh500xlgWs"; // à remplacer
const SAVING_THROW_MACRO_ID = "8ddATWYT9igw2ZXG"; // à remplacer

const dialog = await foundry.applications.api.DialogV2.prompt({
  content: `
    <div style="display: flex; flex-direction: column; padding: 10px; text-align: center;">
      <p>Choisissez le type de jet à demander :</p>
      <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px;">
        <div class="form-group" style="margin: 0; display: flex; flex-direction: column; align-items: center;">
          <label>
            <input type="radio" name="macroChoice" value="skill" checked>
            <div style="display: flex; flex-direction: column; align-items: center; margin-top: 5px;">
              <i class="fas fa-dice-d20" style="font-size: 2em; margin-bottom: 5px;"></i>
              <span>Jet de compétence</span>
            </div>
          </label>
        </div>
        <div class="form-group" style="margin: 0; display: flex; flex-direction: column; align-items: center;">
          <label>
            <input type="radio" name="macroChoice" value="save">
            <div style="display: flex; flex-direction: column; align-items: center; margin-top: 5px;">
              <i class="fas fa-shield-alt" style="font-size: 2em; margin-bottom: 5px;"></i>
              <span>Jet de sauvegarde</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  `,
  rejectClose: false,
  modal: true,
  window: {title: "Type de jet"},
  position: {width: 400, height: "auto"},
  ok: {callback: (event, button) => new FormDataExtended(button.form).object}
});

// Si annulé ou pas de choix
if (!dialog || !dialog.macroChoice) return;

// Exécute la macro sélectionnée
if (dialog.macroChoice === "skill") {
  const macro = game.macros.get(SKILL_CHECK_MACRO_ID);
  if (macro) {
    macro.execute();
  } else {
    ui.notifications.error("Macro de jet de compétence non trouvée. Vérifiez l'ID.");
  }
} else if (dialog.macroChoice === "save") {
  const macro = game.macros.get(SAVING_THROW_MACRO_ID);
  if (macro) {
    macro.execute();
  } else {
    ui.notifications.error("Macro de jet de sauvegarde non trouvée. Vérifiez l'ID.");
  }
}