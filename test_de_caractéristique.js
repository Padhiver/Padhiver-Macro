/**
 * Lance une boîte de dialogue pour qu'un MJ demande un Test de compétence, puis crée un message sur lequel les joueurs peuvent cliquer.
 * Émule entièrement la fonctionnalité du système.
 */

const ability = new foundry.data.fields.StringField({
  required: false, choices: CONFIG.DND5E.abilities, label: "Caractéristique"
}).toFormGroup({}, {name: "ability"}).outerHTML;
const skill = new foundry.data.fields.StringField({
  required: true, choices: CONFIG.DND5E.skills, label: "Compétence"
}).toFormGroup({}, {name: "skill"}).outerHTML;
const dc = new foundry.data.fields.NumberField({
  min: 0, max: 30, integer: true, nullable: false, label: "DD"
}).toFormGroup({}, {name: "dc", value: 10}).outerHTML;

const dataset = await foundry.applications.api.DialogV2.prompt({
  content: `<fieldset>${[ability, skill, dc].join("")}</fieldset>`,
  rejectClose: false,
  modal: true,
  window: {title: "Demande de Test de compétence"},
  position: {width: 400, height: "auto"},
  ok: {callback: (event, button) => new FormDataExtended(button.form).object}
});
if (!dataset) return;

dataset.type = "skill";
dataset.ability ||= CONFIG.DND5E.skills[dataset.skill].ability;

const chatData = {
  user: game.user.id,
  content: await renderTemplate("systems/dnd5e/templates/chat/request-card.hbs", {
    buttons: [{
      buttonLabel: dnd5e.enrichers.createRollLabel({...dataset, format: "short", icon: true}),
      hiddenLabel: dnd5e.enrichers.createRollLabel({...dataset, format: "short", icon: true, hideDC: true}),
      dataset: {...dataset, action: "rollRequest", visibility: "all"},
    }]
  }),
  flavor: game.i18n.localize("EDITOR.DND5E.Inline.RollRequest"),
  speaker: ChatMessage.implementation.getSpeaker({user: game.user})
};
await ChatMessage.implementation.create(chatData);