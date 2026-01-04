/**
 * BABELE CONVERTER EXPORTER (ApplicationV2) - VERSION 6 (MASSE & REFACTOR)
 * Nouveautés V6 :
 * - Export de masse via Checkboxes
 * - Refactoring de la logique Item/Action (méthode centralisée)
 * - Tri alphabétique des clés JSON (Git Friendly)
 * - File d'attente séquentielle pour éviter les crashs navigateurs
 */

(async () => {

    // =================================================================
    // CONFIGURATION : Définissez vos structures complexes ici
    // =================================================================
    const EXPORT_CONFIG = {
        "talent": [{ field: "actions", path: "system.actions", converter: "actions_converter", subFields: ["name", "description", "condition"], idKey: "id" }],
        "spell": [{ field: "actions", path: "system.actions", converter: "actions_converter", subFields: ["name", "description", "condition"], idKey: "id" }],
        "JournalEntry": [{ field: "categories", path: "categories", converter: "categories_converter", subFields: ["name"], idKey: "_id" }],
        "consumable": [{ field: "actions", path: "system.actions", converter: "actions_converter", subFields: ["name", "description"], idKey: "id" }],
        "Actor": [
            { field: "items", path: "items", converter: "adventure_items_converter", subFields: ["name", "description", "actions"], idKey: "id", isActorItem: true },
            { field: "actions", path: "system.actions", converter: "actions_converter", subFields: ["name", "description", "condition"], idKey: "id" },
            { field: "ancestry", path: "system.details.ancestry", converter: "nested_object_converter", subFields: ["name", "description"], isDirectObject: true },
            { field: "background", path: "system.details.background", converter: "nested_object_converter", subFields: ["name", "description"], isDirectObject: true },
            { field: "biography", path: "system.details.biography", converter: "nested_object_converter", subFields: ["appearance", "public", "private"], isDirectObject: true },
            { field: "archetype", path: "system.details.archetype", converter: "nested_object_converter", subFields: ["name", "description"], isDirectObject: true },
            { field: "taxonomy", path: "system.details.taxonomy", converter: "nested_object_converter", subFields: ["name", "description"], isDirectObject: true }
        ],
        "Adventure": [
            { field: "actions", path: "system.actions", converter: "actions_converter", subFields: ["name", "description", "condition"], idKey: "id", isItemAction: true }
        ],
        "default": []
    };

    // =================================================================
    // STYLES CSS
    // =================================================================
    const CSS_STYLES = `
        <style>
            :root {
                --color-border-light-2: #816b66;
                --color-border-dark-2: #816b66;
                --color-text-title-primary: #cdb4a7;
                --color-text-hint-primary: #9f8475;
            }

            /* Conteneur principal */
            .babele-exporter-v9 {
                display: flex;
                flex-direction: column;
                height: 100%;
                overflow: hidden;
            }

            /* Zone de contenu scrollable */
            .babele-scroll {
                flex: 1;
                overflow-y: auto;
                padding-right: 5px;
                margin-bottom: 5px;
            }

            /* Style Fieldset Natif - Adaptatif au thème */
            .babele-exporter-v9 fieldset {
                border: 1px solid var(--color-border-light-2);
                border-radius: 5px;
                margin: 0 0 1rem 0;
                padding: 0.5rem;
                background: rgba(0, 0, 0, 0.05);
            }

            .babele-exporter-v9 legend {
                font-weight: bold;
                font-size: 0.85rem;
                padding: 0 5px;
                color: var(--color-text-title-primary);
                text-shadow: none;
            }

            /* Grille pour les checkboxes */
            .pack-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 5px 10px;
            }

            /* Ligne individuelle de pack */
            .pack-row {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.9rem;
                cursor: pointer;
                padding: 2px 4px;
                border-radius: 3px;
                transition: background-color 0.2s ease;
            }

            .pack-row:hover {
                background: rgba(0, 0, 0, 0.05);
            }

            .pack-row input {
                margin: 0;
                flex: 0 0 auto;
                cursor: pointer;
            }

            .pack-label {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
                color: var(--color-text-hint-primary);
            }

            .pack-count {
                opacity: 0.6;
                font-size: 0.8em;
                font-style: italic;
                color: brown;
            }

            /* Footer avec 3 boutons alignés */
            .form-footer-grid {
                display: flex;
                gap: 8px;
                padding-top: 10px;
                border-top: 1px solid var(--color-border-light-2);
            }

            .form-footer-grid button {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                font-size: 0.85rem;
                line-height: 24px;
                padding: 6px 12px;
                border-radius: 3px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .form-footer-grid button:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .form-footer-grid button:active {
                transform: translateY(0);
            }

            .form-footer-grid button i {
                pointer-events: none;
            }

            /* Bouton "Tout" */
            .check-all-btn {
                border: 1px solid var(--color-border-dark-2);
            }

            .check-all-btn:hover {
                background: var(--color-cool-3);
            }

            /* Bouton "Rien" */
            .uncheck-all-btn {
                border: 1px solid var(--color-border-dark-2);
            }

            .uncheck-all-btn:hover {
                background: var(--color-warm-3);
            }

            /* Bouton "Exporter" */
            .form-footer-grid button.save {
                border: 1px solid var(--color-border-dark-2);
                font-weight: bold;
            }

            .form-footer-grid button.save:hover {
                background: var(--color-level-success-hover, #28a745);
            }

            /* Adaptation pour les petits écrans */
            @media (max-width: 600px) {
                .pack-grid {
                    grid-template-columns: 1fr;
                }

                .form-footer-grid {
                    flex-direction: column;
                }

                .form-footer-grid button {
                    width: 100%;
                }
            }
        </style>
    `;

    // =================================================================
    // APPLICATION V2
    // =================================================================
    class BabeleConverterExporter extends foundry.applications.api.ApplicationV2 {

        constructor(options = {}) {
            super(options);
            this.packs = game.packs.filter(p =>
                ["Item", "Actor", "JournalEntry", "Adventure"].includes(p.metadata.type)
            );
        }

        static DEFAULT_OPTIONS = {
            id: "babele-converter-exporter",
            tag: "form",
            window: {
                title: "Export Babele Avancé (Mass Export)",
                icon: "fa-solid fa-file-export",
                resizable: true,
                contentClasses: ["standard-form"]
            },
            position: { width: 680, height: 750 },
            actions: { export: BabeleConverterExporter.onExport }
        };

        async _prepareContext(options) {
            const context = await super._prepareContext(options);

            const groupedPacks = this.packs.reduce((acc, p) => {
                let itemType = p.metadata.type;
                if (p.metadata.type === "Item" && p.index.size > 0) {
                    const firstDoc = p.index.values().next().value;
                    if (firstDoc?.type) itemType = `Item : ${firstDoc.type.charAt(0).toUpperCase() + firstDoc.type.slice(1)}`;
                }

                if (!acc[itemType]) acc[itemType] = [];
                acc[itemType].push({
                    value: p.metadata.id,
                    label: p.metadata.label,
                    count: p.index.size
                });
                return acc;
            }, {});

            const sortedKeys = Object.keys(groupedPacks).sort();
            const sortedGroups = {};
            sortedKeys.forEach(k => sortedGroups[k] = groupedPacks[k]);

            return { ...context, groupedPacks: sortedGroups };
        }

        async _renderHTML(context, options) {
            let listHtml = '';

            for (const [type, packs] of Object.entries(context.groupedPacks)) {
                listHtml += `
                <fieldset>
                    <legend>${type}</legend>
                    <div class="pack-grid">
                        ${packs.map(p => `
                        <label class="pack-row" title="${p.label}">
                            <input type="checkbox" name="packs" value="${p.value}">
                            <span class="pack-label">
                                ${p.label} <span class="pack-count">(${p.count})</span>
                            </span>
                        </label>
                        `).join('')}
                    </div>
                </fieldset>`;
            }

            const html = `
                ${CSS_STYLES}
                <div class="babele-exporter-v9">
                    
                    <div class="babele-scroll">
                        ${listHtml}
                    </div>
                    
                    <div class="form-footer-grid">
                        <button type="button" class="check-all-btn">
                            <i class="fa-solid fa-check-double"></i> Tout
                        </button>
                        <button type="button" class="uncheck-all-btn">
                            <i class="fa-regular fa-square"></i> Rien
                        </button>
                        <button type="button" data-action="export" class="save">
                            <i class="fa-solid fa-file-export"></i> Exporter
                        </button>
                    </div>
                </div>
            `;

            return { form: html };
        }

        _replaceHTML(result, content, options) {
            content.innerHTML = result.form;
            const checkboxes = content.querySelectorAll('input[name="packs"]');

            content.querySelector('.check-all-btn')?.addEventListener('click', () => checkboxes.forEach(c => c.checked = true));
            content.querySelector('.uncheck-all-btn')?.addEventListener('click', () => checkboxes.forEach(c => c.checked = false));
        }

        static async onExport(event, target) {
            const form = target.closest("form");
            const checkboxes = form.querySelectorAll('input[name="packs"]:checked');
            const packIds = Array.from(checkboxes).map(cb => cb.value);

            if (packIds.length === 0) {
                ui.notifications.warn("Aucun compendium sélectionné.");
                return;
            }
            this.close();

            ui.notifications.info(`🚀 Début de l'export de masse (${packIds.length} packs)...`);
            console.log("=== DÉBUT EXPORT DE MASSE ===");

            let successCount = 0;
            for (let i = 0; i < packIds.length; i++) {
                const pack = game.packs.get(packIds[i]);
                if (pack) {
                    try {
                        if (i > 0) await new Promise(r => setTimeout(r, 100));
                        await BabeleConverterExporter.performExport(pack, true);
                        successCount++;
                        console.log(`[${i + 1}/${packIds.length}] ✅ ${pack.metadata.label}`);
                    } catch (e) {
                        console.error(`Erreur sur ${pack.metadata.label}:`, e);
                        ui.notifications.error(`Erreur sur ${pack.metadata.label}`);
                    }
                }
            }
            ui.notifications.info(`✨ Terminé : ${successCount}/${packIds.length} exportés.`);
            console.log("=== FIN EXPORT DE MASSE ===");
        }

        static getItemTranslation(itemDocOrData) {
            const itemData = itemDocOrData.system ? itemDocOrData : itemDocOrData.toObject();
            const translation = { "name": itemDocOrData.name };

            const desc = foundry.utils.getProperty(itemData, "system.description");
            if (desc) {
                if (typeof desc === 'object') {
                    const descObj = {};
                    if (desc.public?.trim()) descObj.public = desc.public;
                    if (desc.private?.trim()) descObj.private = desc.private;
                    if (desc.value && typeof desc.value === 'string' && desc.value.trim()) {
                        if (Object.keys(descObj).length === 0) translation["description"] = desc.value;
                        else descObj.value = desc.value;
                    }
                    if (Object.keys(descObj).length > 0) translation["description"] = descObj;
                } else if (typeof desc === 'string' && desc.trim()) {
                    translation["description"] = desc;
                }
            }

            const actions = foundry.utils.getProperty(itemData, "system.actions");
            if (Array.isArray(actions) && actions.length > 0) {
                const actionsData = {};
                for (const action of actions) {
                    if (!action.id) continue;
                    const actionTrans = {};
                    if (action.name?.trim()) actionTrans["name"] = action.name;
                    if (action.description?.trim()) actionTrans["description"] = action.description;
                    if (action.condition?.trim()) actionTrans["condition"] = action.condition;

                    if (Array.isArray(action.effects) && action.effects.length > 0) {
                        const effectsData = action.effects.filter(e => e.name?.trim()).map(e => ({ "name": e.name }));
                        if (effectsData.length > 0) actionTrans["effects"] = effectsData;
                    }
                    if (Object.keys(actionTrans).length > 0) actionsData[action.id] = actionTrans;
                }
                if (Object.keys(actionsData).length > 0) translation["actions"] = actionsData;
            }
            return translation;
        }

        static async performExport(pack, silent = false) {
            if (!silent) ui.notifications.info(`Chargement de ${pack.metadata.label}...`);
            const documents = await pack.getDocuments();
            if (!documents.length) return;

            const entriesData = {};
            const foldersData = {};

            const collectAllFolders = (folder) => {
                if (!folder) return;
                foldersData[folder.name] = folder.name;
                if (folder.children) folder.children.forEach(child => { if (child.folder) collectAllFolders(child.folder); });
            };
            if (pack.folders) pack.folders.forEach(f => collectAllFolders(f));

            const itemType = pack.metadata.type === "Item" ? documents[0]?.type : pack.metadata.type;
            const config = EXPORT_CONFIG[itemType] || EXPORT_CONFIG["default"];

            if (pack.metadata.type === "Adventure") {
                for (const doc of documents) {
                    const adventureTranslation = { "name": doc.name };
                    if (doc.caption?.trim()) adventureTranslation["caption"] = doc.caption;
                    if (doc.description?.trim()) adventureTranslation["description"] = doc.description;

                    if (doc.scenes?.size) {
                        adventureTranslation["scenes"] = {};
                        doc.scenes.forEach(s => adventureTranslation["scenes"][s.name] = { "name": s.name });
                    }
                    if (doc.macros?.size) {
                        adventureTranslation["macros"] = {};
                        doc.macros.forEach(m => adventureTranslation["macros"][m.name] = { "name": m.name, "command": m.command });
                    }
                    if (doc.folders?.size) {
                        adventureTranslation["folders"] = {};
                        doc.folders.forEach(f => adventureTranslation["folders"][f.name] = f.name);
                    }
                    if (doc.journal?.size) {
                        const journalsData = {};
                        doc.journal.forEach(j => {
                            const jTrans = { "name": j.name };
                            if (j.pages?.size) {
                                jTrans["pages"] = {};
                                j.pages.forEach(p => {
                                    const pTrans = { "name": p.name };
                                    if (p.text?.content?.trim()) pTrans["text"] = p.text.content;
                                    jTrans["pages"][p.name] = pTrans;
                                });
                            }
                            journalsData[j.name] = jTrans;
                        });
                        adventureTranslation["journals"] = journalsData;
                    }

                    if (doc.actors?.size) {
                        const actorsData = {};
                        const actorConfig = EXPORT_CONFIG["Actor"] || [];
                        for (const actor of doc.actors) {
                            const actorTrans = { "name": actor.name, "tokenName": actor.prototypeToken?.name || actor.name };
                            for (const conf of actorConfig) {
                                if (conf.field === "items") continue;
                                const data = foundry.utils.getProperty(actor, conf.path);
                                if (conf.isDirectObject && data && typeof data === 'object') {
                                    const nested = {};
                                    conf.subFields.forEach(f => { if (data[f]?.trim()) nested[f] = data[f]; });
                                    if (Object.keys(nested).length) actorTrans[conf.field] = nested;
                                }
                                else if (Array.isArray(data) && data.length > 0 && !conf.isActorItem) {
                                    const nested = {};
                                    data.forEach(el => {
                                        const id = el[conf.idKey || "id"];
                                        if (!id) return;
                                        const elTrans = {};
                                        conf.subFields.forEach(f => { if (el[f]?.trim()) elTrans[f] = el[f]; });
                                        if (Object.keys(elTrans).length) nested[id] = elTrans;
                                    });
                                    if (Object.keys(nested).length) actorTrans[conf.field] = nested;
                                }
                            }
                            if (actor.items?.size > 0) {
                                const itemsData = {};
                                actor.items.forEach(item => {
                                    itemsData[item.name] = BabeleConverterExporter.getItemTranslation(item);
                                });
                                if (Object.keys(itemsData).length > 0) actorTrans["items"] = itemsData;
                            }
                            if (actorsData[actor.name]) foundry.utils.mergeObject(actorsData[actor.name], actorTrans, { recursive: true });
                            else actorsData[actor.name] = actorTrans;
                        }
                        adventureTranslation["actors"] = actorsData;
                    }
                    if (entriesData[doc.name]) foundry.utils.mergeObject(entriesData[doc.name], adventureTranslation, { recursive: true });
                    else entriesData[doc.name] = adventureTranslation;
                }
            }
            else {
                for (const doc of documents) {
                    const originalName = doc.name;
                    const docData = doc.toObject();
                    let itemTranslation = {};

                    if (pack.metadata.type === "Item" || pack.metadata.type === "Actor") {
                        itemTranslation = BabeleConverterExporter.getItemTranslation(doc);
                    } else {
                        itemTranslation = { "name": originalName };
                        const desc = foundry.utils.getProperty(doc, "system.description");
                        if (desc && typeof desc === 'string' && desc.trim()) itemTranslation.description = desc;
                    }

                    if (pack.metadata.type === "Actor" && doc.items?.size > 0) {
                        const itemsData = {};
                        doc.items.forEach(item => {
                            itemsData[item.name] = BabeleConverterExporter.getItemTranslation(item);
                        });
                        if (Object.keys(itemsData).length > 0) itemTranslation["items"] = itemsData;
                    }

                    for (const conf of config) {
                        const data = foundry.utils.getProperty(docData, conf.path);
                        if (conf.isDirectObject && data && typeof data === 'object') {
                            const nested = {};
                            conf.subFields.forEach(f => { if (data[f]?.trim()) nested[f] = data[f]; });
                            if (Object.keys(nested).length) itemTranslation[conf.field] = nested;
                        }
                        else if (Array.isArray(data) && data.length > 0 && conf.field !== "items" && conf.field !== "actions") {
                            const nested = {};
                            data.forEach(el => {
                                const id = el[conf.idKey || "id"];
                                if (!id) return;
                                const elTrans = {};
                                conf.subFields.forEach(f => { if (el[f]?.trim()) elTrans[f] = el[f]; });
                                if (Object.keys(elTrans).length) nested[id] = elTrans;
                            });
                            if (Object.keys(nested).length) itemTranslation[conf.field] = nested;
                        }
                    }

                    if (pack.metadata.type === "JournalEntry" && doc.pages) {
                        const pagesData = {};
                        doc.pages.forEach(p => {
                            const pTrans = { "name": p.name };
                            if (p.text?.content?.trim()) pTrans["text"] = p.text.content;
                            pagesData[p.name] = pTrans;
                        });
                        if (Object.keys(pagesData).length > 0) itemTranslation["pages"] = pagesData;
                    }
                    if (entriesData[originalName]) foundry.utils.mergeObject(entriesData[originalName], itemTranslation, { recursive: true });
                    else entriesData[originalName] = itemTranslation;
                }
            }

            const mapping = {};
            if (pack.metadata.type === "Adventure") {
                mapping["actors"] = {};
                (EXPORT_CONFIG["Actor"] || []).forEach(c => {
                    if (c.converter) mapping["actors"][c.field] = { "path": c.path, "converter": c.converter };
                });
                mapping["items"] = {}; mapping["journals"] = {}; mapping["scenes"] = {}; mapping["macros"] = {};
            } else if (pack.metadata.type === "Actor") {
                mapping["items"] = { "path": "items", "converter": "adventure_items_converter" };
            } else if (pack.metadata.type !== "JournalEntry") {
                mapping["description"] = "system.description";
            }

            config.forEach(conf => {
                if (!conf.isItemAction && !conf.isActorItem) {
                    mapping[conf.field] = { "path": conf.path, "converter": conf.converter };
                }
            });

            const sortedEntries = Object.keys(entriesData).sort((a, b) => a.localeCompare(b)).reduce((acc, key) => {
                acc[key] = entriesData[key];
                return acc;
            }, {});

            const finalExport = {
                "label": pack.metadata.label,
                "mapping": mapping,
                "folders": foldersData,
                "entries": sortedEntries
            };

            const fileName = `${pack.metadata.id}.json`;
            saveDataToFile(JSON.stringify(finalExport, null, 2), "application/json", fileName);
            if (!silent) ui.notifications.info(`✅ Export réussi : ${fileName}`);
        }
    }

    new BabeleConverterExporter().render(true);
})();