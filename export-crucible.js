/**
 * BABELE CONVERTER EXPORTER (ApplicationV2) - VERSION 5
 * 
 * Version simplifiée qui suit la logique native de Babele :
 * - Pas de converters pour la navigation hiérarchique standard
 * - Converters uniquement pour les structures complexes (system.actions)
 * - Export complet des Adventures avec toute leur hiérarchie
 */

(async () => {

    // =================================================================
    // CONFIGURATION : Définissez vos structures complexes ici
    // =================================================================
    const EXPORT_CONFIG = {
        /**
         * Configuration pour les talents
         */
        "talent": [
            {
                field: "actions",
                path: "system.actions",
                converter: "actions_converter",
                subFields: ["name", "description", "condition"],
                idKey: "id"
            }
        ],

        /**
         * Configuration pour les sorts
         */
        "spell": [
            {
                field: "actions",
                path: "system.actions",
                converter: "actions_converter",
                subFields: ["name", "description", "condition"],
                idKey: "id"
            }
        ],

        /**
         * Configuration pour les JournalEntry
         */
        "JournalEntry": [
            {
                field: "categories",
                path: "categories",
                converter: "categories_converter",
                subFields: ["name"],
                idKey: "_id"
            }
        ],

        /**
         * Configuration pour les equipments
         */
        "consumable": [
            {
                field: "actions",
                path: "system.actions",
                converter: "actions_converter",
                subFields: ["name", "description"],
                idKey: "id"
            }
        ],

        "Actor": [
            // Items
            {
                field: "items",
                path: "items",
                converter: "adventure_items_converter",
                subFields: ["name", "description", "actions"],
                idKey: "id",
                isActorItem: true
            },
            // Actions
            {
                field: "actions",
                path: "system.actions",
                converter: "actions_converter",
                subFields: ["name", "description", "condition"],
                idKey: "id"
            },
            // Ancestry
            {
                field: "ancestry",
                path: "system.details.ancestry",
                converter: "nested_object_converter",
                subFields: ["name", "description"],
                idKey: null,
                isDirectObject: true
            },
            // Background
            {
                field: "background",
                path: "system.details.background",
                converter: "nested_object_converter",
                subFields: ["name", "description"],
                idKey: null,
                isDirectObject: true
            },
            // Biography
            {
                field: "biography",
                path: "system.details.biography",
                converter: "nested_object_converter",
                subFields: ["appearance", "public", "private"],
                idKey: null,
                isDirectObject: true
            },
            // Archetype
            {
                field: "archetype",
                path: "system.details.archetype", // Chemin direct vers l'objet
                converter: "nested_object_converter", // Utilise le converter pour objets complexes
                subFields: ["name", "description"], // Champs internes à traduire
                idKey: null,
                isDirectObject: true
            },
            // Taxonomy
            {
                field: "taxonomy",
                path: "system.details.taxonomy", // Chemin direct vers l'objet
                converter: "nested_object_converter", // Utilise le converter pour objets complexes
                subFields: ["name", "description"], // Champs internes à traduire
                idKey: null,
                isDirectObject: true
            }
        ],

        /**
         * Configuration pour les Adventures
         * Note: Babele gère nativement la hiérarchie des Adventures,
         * seuls les actions des items nécessitent un converter
         */
        "Adventure": [
            {
                field: "actions",
                path: "system.actions",
                converter: "actions_converter",
                subFields: ["name", "description", "condition"],
                idKey: "id",
                isItemAction: true  // Flag pour indiquer que c'est dans les items
            }
        ],

        /**
         * Configuration par défaut
         */
        "default": []
    };

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
                title: "Export Babele Avancé",
                icon: "fa-solid fa-file-export",
                resizable: false
            },
            position: {
                width: 600,
                height: "auto"
            },
            actions: {
                export: BabeleConverterExporter.onExport
            }
        };

        static PARTS = {
            form: {
                template: "templates/generic/tab-navigation.html"
            }
        };

        async _prepareContext(options) {
            const context = await super._prepareContext(options);

            const compendiumOptions = this.packs.map(p => {
                let itemType = p.metadata.type;
                if (p.metadata.type === "Item" && p.index.size > 0) {
                    const firstDoc = p.index.values().next().value;
                    if (firstDoc?.type) itemType = firstDoc.type;
                }

                return {
                    value: p.metadata.id,
                    label: `${p.metadata.label} (${p.metadata.id})`,
                    type: itemType
                };
            });

            return {
                ...context,
                compendiums: compendiumOptions,
                exportConfig: EXPORT_CONFIG
            };
        }

        async _renderHTML(context, options) {
            const html = `
                <div class="babele-exporter-container" style="padding: 1rem;">
                    <!-- Sélection du compendium -->
                    <section style="margin-bottom: 1rem;">
                        <h3 style="border-bottom: 2px solid var(--color-border-dark); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fa-solid fa-database"></i> Compendium à Exporter
                        </h3>
                        <div class="form-group" style="margin-bottom: 0.5rem;">
                            <label for="compendium-select" style="font-weight: bold;">Sélectionnez un compendium :</label>
                            <select id="compendium-select" name="compendium" style="width: 100%; padding: 0.5rem;">
                                ${context.compendiums.map(c =>
                `<option value="${c.value}">${c.label}</option>`
            ).join('')}
                            </select>
                        </div>
                    </section>

                    <!-- Configuration active -->
                    <section style="margin-bottom: 1rem;">
                        <h3 style="border-bottom: 2px solid var(--color-border-dark); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fa-solid fa-cog"></i> Configuration Détectée
                        </h3>
                        <div id="config-display">
                            <p style="font-size: 0.9em; margin: 0; font-style: italic; color: #999;">
                                Sélectionnez un compendium pour voir sa configuration...
                            </p>
                        </div>
                    </section>
                    
                    <!-- Bouton d'export -->
                    <button type="button" data-action="export" style="width: 100%; padding: 0.75rem; font-size: 1rem;">
                        <i class="fa-solid fa-file-export"></i> Exporter au format Babele
                    </button>
                </div>
            `;

            return {
                form: html,
                exportConfig: context.exportConfig
            };
        }

        _replaceHTML(result, content, options) {
            content.innerHTML = result.form;

            const select = content.querySelector('#compendium-select');
            const configSection = content.querySelector('#config-display');

            if (select && configSection) {
                const updateConfig = () => {
                    const selectedOption = select.options[select.selectedIndex];
                    const packId = selectedOption.value;
                    const pack = game.packs.get(packId);

                    if (!pack) return;

                    let itemType = pack.metadata.type;
                    if (pack.metadata.type === "Item" && pack.index.size > 0) {
                        const firstDoc = pack.index.values().next().value;
                        if (firstDoc?.type) itemType = firstDoc.type;
                    }

                    const config = result.exportConfig[itemType] || result.exportConfig["default"];

                    if (config.length > 0) {
                        const details = config.map(c =>
                            `<li><code>${c.field}</code> via le converter <code>${c.converter}</code> (champs: ${c.subFields.join(', ')})</li>`
                        ).join('');
                        configSection.innerHTML = `
                            <ul style="font-size: 0.9em; margin: 0; padding-left: 1.5rem;">
                                <li><strong>Type détecté :</strong> <code>${itemType}</code></li>
                                ${details}
                            </ul>
                        `;
                    } else {
                        configSection.innerHTML = `
                            <p style="font-size: 0.9em; margin: 0; font-style: italic;">
                                Aucune structure complexe configurée pour le type <code>${itemType}</code>. 
                                ${itemType === 'Adventure' ? 'La hiérarchie complète (actors, items, journals, scenes, macros) sera exportée nativement.' : 'Seuls les champs simples (nom, description) seront exportés.'}
                            </p>
                        `;
                    }
                };

                updateConfig();
                select.addEventListener('change', updateConfig);
            }
        }

        static async onExport(event, target) {
            const form = target.closest("form");
            const formData = new FormDataExtended(form).object;
            const compendiumId = formData.compendium;

            if (!compendiumId) {
                ui.notifications.error("Aucun compendium sélectionné.");
                return;
            }

            const pack = game.packs.get(compendiumId);
            if (!pack) {
                ui.notifications.error(`Compendium introuvable : ${compendiumId}`);
                return;
            }

            this.close();

            await BabeleConverterExporter.performExport(pack);
        }

        static async performExport(pack) {
            ui.notifications.info(`Chargement de ${pack.metadata.label}...`);

            const documents = await pack.getDocuments();
            if (!documents.length) {
                ui.notifications.warn("Le compendium est vide.");
                return;
            }

            const entriesData = {};
            const foldersData = {};

            const itemType = pack.metadata.type === "Item" ? documents[0]?.type : pack.metadata.type;
            const config = EXPORT_CONFIG[itemType] || EXPORT_CONFIG["default"];

            // ===================================================
            // CORRECTION : Collecter TOUS les dossiers du pack
            // ===================================================
            const collectAllFolders = (folder) => {
                if (!folder) return;

                // Ajouter ce dossier
                foldersData[folder.name] = folder.name;

                // Parcourir récursivement les sous-dossiers
                if (folder.children) {
                    for (const child of folder.children) {
                        if (child.folder) {
                            collectAllFolders(child.folder);
                        }
                    }
                }
            };

            // Parcourir tous les dossiers racine du pack
            if (pack.folders) {
                for (const folder of pack.folders) {
                    collectAllFolders(folder);
                }
            }

            // ===================================================
            // Traitement spécial pour les ADVENTURES
            // ===================================================
            if (pack.metadata.type === "Adventure") {
                for (const doc of documents) {
                    const adventureTranslation = {
                        "name": doc.name
                    };

                    // Caption et description (seulement si non vides)
                    if (doc.caption?.trim()) adventureTranslation["caption"] = doc.caption;
                    if (doc.description?.trim()) adventureTranslation["description"] = doc.description;

                    // Scenes
                    if (doc.scenes?.size > 0) {
                        const scenesData = {};
                        for (const scene of doc.scenes) {
                            scenesData[scene.name] = { "name": scene.name };
                        }
                        adventureTranslation["scenes"] = scenesData;
                    }

                    // Macros
                    if (doc.macros?.size > 0) {
                        const macrosData = {};
                        for (const macro of doc.macros) {
                            macrosData[macro.name] = {
                                "name": macro.name,
                                "command": macro.command
                            };
                        }
                        adventureTranslation["macros"] = macrosData;
                    }

                    // Actors (avec leurs items et actions)
                    if (doc.actors?.size > 0) {
                        const actorsData = {};
                        const actorConfig = EXPORT_CONFIG["Actor"] || [];

                        for (const actor of doc.actors) {
                            const actorTranslation = {
                                "name": actor.name,
                                "tokenName": actor.prototypeToken?.name || actor.name
                            };

                            // === UTILISATION DE EXPORT_CONFIG POUR LES STRUCTURES COMPLEXES ===
                            for (const conf of actorConfig) {
                                // Skip les items car traités séparément
                                if (conf.field === "items") continue;

                                const data = foundry.utils.getProperty(actor, conf.path);

                                // CAS 1 : Objet direct (ancestry, background, biography, details)
                                if (conf.isDirectObject && data && typeof data === 'object') {
                                    const nestedObject = {};
                                    for (const subField of conf.subFields) {
                                        const value = data[subField];
                                        if (value && typeof value === 'string' && value.trim() !== "") {
                                            nestedObject[subField] = value;
                                        }
                                    }
                                    if (Object.keys(nestedObject).length > 0) {
                                        actorTranslation[conf.field] = nestedObject;
                                    }
                                }
                                // CAS 2 : Array (actions directes de l'acteur)
                                else if (Array.isArray(data) && data.length > 0 && !conf.isActorItem) {
                                    const nestedObject = {};
                                    for (const element of data) {
                                        const id = element[conf.idKey || "id"];
                                        if (!id) continue;

                                        const elementTranslation = {};
                                        for (const subField of conf.subFields) {
                                            const value = foundry.utils.getProperty(element, subField);
                                            if (value && typeof value === 'string' && value.trim() !== "") {
                                                elementTranslation[subField] = value;
                                            }
                                        }
                                        if (Object.keys(elementTranslation).length > 0) {
                                            nestedObject[id] = elementTranslation;
                                        }
                                    }
                                    if (Object.keys(nestedObject).length > 0) {
                                        actorTranslation[conf.field] = nestedObject;
                                    }
                                }
                            }

                            // Items de l'acteur
                            if (actor.items?.size > 0) {
                                const itemsData = {};
                                for (const item of actor.items) {
                                    const itemTranslation = { "name": item.name };

                                    // Description de l'item (pour les talents notamment)
                                    if (item.system?.description) {
                                        // Si c'est un objet avec public/private
                                        if (typeof item.system.description === 'object') {
                                            const descObj = {};
                                            if (item.system.description.public?.trim()) {
                                                descObj.public = item.system.description.public;
                                            }
                                            if (item.system.description.private?.trim()) {
                                                descObj.private = item.system.description.private;
                                            }
                                            if (Object.keys(descObj).length > 0) {
                                                itemTranslation["description"] = descObj;
                                            }
                                        }
                                        // Si c'est une string simple
                                        else if (typeof item.system.description === 'string' && item.system.description.trim()) {
                                            itemTranslation["description"] = item.system.description;
                                        }
                                    }

                                    // Actions de l'item
                                    const actions = item.system?.actions;
                                    if (Array.isArray(actions) && actions.length > 0) {
                                        const actionsData = {};
                                        for (const action of actions) {
                                            if (!action.id) continue;

                                            const actionTranslation = {};
                                            if (action.name?.trim()) actionTranslation["name"] = action.name;
                                            if (action.description?.trim()) actionTranslation["description"] = action.description;
                                            if (action.condition?.trim()) actionTranslation["condition"] = action.condition;

                                            // Exporter les effets de l'action
                                            if (Array.isArray(action.effects) && action.effects.length > 0) {
                                                const effectsData = [];
                                                for (const effect of action.effects) {
                                                    const effectTranslation = {};
                                                    if (effect.name?.trim()) effectTranslation["name"] = effect.name;
                                                    if (Object.keys(effectTranslation).length > 0) {
                                                        effectsData.push(effectTranslation);
                                                    }
                                                }
                                                if (effectsData.length > 0) {
                                                    actionTranslation["effects"] = effectsData;
                                                }
                                            }

                                            if (Object.keys(actionTranslation).length > 0) {
                                                actionsData[action.id] = actionTranslation;
                                            }
                                        }
                                        if (Object.keys(actionsData).length > 0) {
                                            itemTranslation["actions"] = actionsData;
                                        }
                                    }

                                    itemsData[item.name] = itemTranslation;
                                }
                                if (Object.keys(itemsData).length > 0) {
                                    actorTranslation["items"] = itemsData;
                                }
                            }

                            // CORRECTION : Fusion si l'acteur existe déjà 
                            if (actorsData[actor.name]) {
                                foundry.utils.mergeObject(actorsData[actor.name], actorTranslation, { recursive: true });
                            } else {
                                actorsData[actor.name] = actorTranslation;
                            }
                        }
                        adventureTranslation["actors"] = actorsData;
                    }

                    // Folders de l'adventure
                    if (doc.folders?.size > 0) {
                        const adventureFoldersData = {};
                        for (const folder of doc.folders) {
                            adventureFoldersData[folder.name] = folder.name;
                        }
                        adventureTranslation["folders"] = adventureFoldersData;
                    }

                    // Journals (avec leurs pages)
                    if (doc.journal?.size > 0) {
                        const journalsData = {};
                        for (const journal of doc.journal) {
                            const journalTranslation = { "name": journal.name };

                            // Pages du journal
                            if (journal.pages?.size > 0) {
                                const pagesData = {};
                                for (const page of journal.pages) {
                                    const pageTranslation = { "name": page.name };
                                    if (page.text?.content?.trim()) {
                                        pageTranslation["text"] = page.text.content;
                                    }
                                    pagesData[page.name] = pageTranslation;
                                }
                                if (Object.keys(pagesData).length > 0) {
                                    journalTranslation["pages"] = pagesData;
                                }
                            }

                            journalsData[journal.name] = journalTranslation;
                        }
                        adventureTranslation["journals"] = journalsData;
                    }

                    // CORRECTION : Fusion si l'adventure existe déjà 
                    if (entriesData[doc.name]) {
                        foundry.utils.mergeObject(entriesData[doc.name], adventureTranslation, { recursive: true });
                    } else {
                        entriesData[doc.name] = adventureTranslation;
                    }
                }
            }
            // ===================================================
            // Traitement STANDARD pour les autres types
            // ===================================================
            else {
                for (const doc of documents) {
                    const originalName = doc.name;
                    const docData = doc.toObject();

                    const itemTranslation = {
                        "name": originalName
                    };

                    // --- CORRECTION : Récupération de la description (Manquante dans l'export standard) ---
                    const descriptionData = foundry.utils.getProperty(doc, "system.description");

                    if (descriptionData) {
                        let descriptionToExport = null;

                        if (typeof descriptionData === 'string' && descriptionData.trim()) {
                            // Cas 1: La description est une chaîne de caractères simple.
                            descriptionToExport = descriptionData;
                        } else if (typeof descriptionData === 'object' && descriptionData !== null) {
                            // Cas 2: La description est un objet.

                            // 2a. Cas le plus fréquent (ex: Description simple dans .value)
                            if (typeof descriptionData.value === 'string' && descriptionData.value.trim()) {
                                descriptionToExport = descriptionData.value;
                            }
                            // 2b. Cas spécial (ex: PF2e - public/private)
                            else {
                                const descObj = {};
                                if (descriptionData.public?.trim()) descObj.public = descriptionData.public;
                                if (descriptionData.private?.trim()) descObj.private = descriptionData.private;

                                if (Object.keys(descObj).length > 0) {
                                    // S'il y a du public ET/OU du private, on exporte l'objet structuré
                                    descriptionToExport = descObj;
                                }
                            }
                        }

                        // Ajout final à l'objet de traduction
                        if (descriptionToExport) {
                            itemTranslation["description"] = descriptionToExport;
                        }
                    }
                    // --- FIN DE LA CORRECTION DESCRIPTION ---

                    // Traitement spécial pour les ACTORS : Ajout des items et de leurs actions
                    if (pack.metadata.type === "Actor" && doc.items?.size > 0) {
                        const itemsData = {};
                        for (const item of doc.items) {
                            const itemTranslation = { "name": item.name };

                            // Description de l'item (logique répliquée de l'adventure)
                            if (item.system?.description) {
                                if (typeof item.system.description === 'object') {
                                    const descObj = {};
                                    if (item.system.description.public?.trim()) {
                                        descObj.public = item.system.description.public;
                                    }
                                    if (item.system.description.private?.trim()) {
                                        descObj.private = item.system.description.private;
                                    }
                                    if (Object.keys(descObj).length > 0) {
                                        itemTranslation["description"] = descObj;
                                    }
                                }
                                else if (typeof item.system.description === 'string' && item.system.description.trim()) {
                                    itemTranslation["description"] = item.system.description;
                                }
                            }

                            // Actions de l'item (logique répliquée de l'adventure)
                            const actions = item.system?.actions;
                            if (Array.isArray(actions) && actions.length > 0) {
                                const actionsData = {};
                                for (const action of actions) {
                                    if (!action.id) continue;

                                    const actionTranslation = {};
                                    if (action.name?.trim()) actionTranslation["name"] = action.name;
                                    if (action.description?.trim()) actionTranslation["description"] = action.description;
                                    if (action.condition?.trim()) actionTranslation["condition"] = action.condition;

                                    // Exporter les effets de l'action
                                    if (Array.isArray(action.effects) && action.effects.length > 0) {
                                        const effectsData = [];
                                        for (const effect of action.effects) {
                                            const effectTranslation = {};
                                            if (effect.name?.trim()) effectTranslation["name"] = effect.name;
                                            if (Object.keys(effectTranslation).length > 0) {
                                                effectsData.push(effectTranslation);
                                            }
                                        }
                                        if (effectsData.length > 0) {
                                            actionTranslation["effects"] = effectsData;
                                        }
                                    }

                                    if (Object.keys(actionTranslation).length > 0) {
                                        actionsData[action.id] = actionTranslation;
                                    }
                                }
                                if (Object.keys(actionsData).length > 0) {
                                    itemTranslation["actions"] = actionsData;
                                }
                            }

                            itemsData[item.name] = itemTranslation;
                        }

                        if (Object.keys(itemsData).length > 0) {
                            itemTranslation["items"] = itemsData;
                        }
                    }

                    // Traiter les structures complexes (actions, etc.) - LOGIQUE EXISTANTE

                    // ... (reste du traitement standard)
                    // Traiter les structures complexes
                    for (const conf of config) {
                        const data = foundry.utils.getProperty(docData, conf.path);

                        // CAS 1 : Objet direct (ancestry, background, biography, details)
                        if (conf.isDirectObject) {
                            if (data && typeof data === 'object') {
                                const nestedObject = {};
                                for (const subField of conf.subFields) {
                                    const value = data[subField];
                                    if (value && typeof value === 'string' && value.trim() !== "") {
                                        nestedObject[subField] = value;
                                    }
                                }
                                if (Object.keys(nestedObject).length > 0) {
                                    itemTranslation[conf.field] = nestedObject;
                                }
                            }
                            continue; // Skip le traitement array ci-dessous
                        }

                        // CAS 2 : Array (actions, etc.) - TON CODE EXISTANT
                        if (Array.isArray(data) && data.length > 0) {
                            const nestedObject = {};

                            for (const element of data) {
                                const id = element[conf.idKey || "id"];
                                if (!id) continue;

                                const elementTranslation = {};
                                for (const subField of conf.subFields) {
                                    const value = foundry.utils.getProperty(element, subField);
                                    if (value && typeof value === 'string' && value.trim() !== "") {
                                        elementTranslation[subField] = value;
                                    }
                                }
                                if (Object.keys(elementTranslation).length > 0) {
                                    nestedObject[id] = elementTranslation;
                                }
                            }

                            if (Object.keys(nestedObject).length > 0) {
                                itemTranslation[conf.field] = nestedObject;
                            }
                        }
                    }

                    // Traitement spécial pour les pages des JournalEntry
                    if (pack.metadata.type === "JournalEntry" && doc.pages) {
                        const pagesData = {};

                        for (const page of doc.pages) {
                            const pageTranslation = {
                                "name": page.name
                            };

                            // Ajouter le contenu texte si disponible
                            if (page.text?.content?.trim()) {
                                pageTranslation["text"] = page.text.content;
                            }

                            pagesData[page.name] = pageTranslation;
                        }

                        if (Object.keys(pagesData).length > 0) {
                            itemTranslation["pages"] = pagesData;
                        }
                    }

                    // CORRECTION : Fusion (Merge) pour éviter d'écraser les doublons (ex: Actor niv 1 et niv 6)
                    if (entriesData[originalName]) {
                        foundry.utils.mergeObject(entriesData[originalName], itemTranslation, { recursive: true });
                    } else {
                        entriesData[originalName] = itemTranslation;
                    }
                }
            }

            // Créer le mapping
            const mapping = {};

            // Pour les Adventures, on doit déclarer les converters pour les structures complexes des actors
            if (pack.metadata.type === "Adventure") {
                mapping["actors"] = {};

                // Ajouter tous les converters depuis EXPORT_CONFIG["Actor"]
                const actorConfig = EXPORT_CONFIG["Actor"] || [];
                for (const conf of actorConfig) {
                    if (conf.converter) {
                        mapping["actors"][conf.field] = {
                            "path": conf.path,
                            "converter": conf.converter
                        };
                    }
                }

                mapping["items"] = {};
                mapping["journals"] = {};
                mapping["scenes"] = {};
                mapping["macros"] = {};
            }
            // Ajout du mapping pour les acteurs
            else if (pack.metadata.type === "Actor") {
                mapping["items"] = {
                    "path": "items",
                    "converter": "adventure_items_converter"
                };
            }
            else {
                // Ajouter description seulement si ce n'est pas un JournalEntry
                if (pack.metadata.type !== "JournalEntry") {
                    mapping["description"] = "system.description";
                }
            }

            for (const conf of config) {
                if (!conf.isItemAction && !conf.isActorItem) {
                    mapping[conf.field] = {
                        "path": conf.path,
                        "converter": conf.converter
                    };
                }
            }

            const finalExport = {
                "label": pack.metadata.label,
                "mapping": mapping,
                "folders": foldersData,
                "entries": entriesData
            };

            // Export du JSON
            const jsonContent = JSON.stringify(finalExport, null, 2);
            const fileName = `${pack.metadata.id}.json`;

            saveDataToFile(jsonContent, "application/json", fileName);

            ui.notifications.info(`✅ Export JSON réussi : ${fileName} (${Object.keys(foldersData).length} dossiers exportés)`);

            // Générer le converter si nécessaire
            const convertersNeeded = config.filter(c => !c.isItemAction);
            if (convertersNeeded.length > 0) {
                BabeleConverterExporter.generateConverter(convertersNeeded, itemType);
            }
        }

        static generateConverter(config, itemType) {
            let converterCode = `// ============================================\n`;
            converterCode += `// CONVERTER POUR : ${itemType}\n`;
            converterCode += `// À ajouter dans babele-register.js\n`;
            converterCode += `// ============================================\n\n`;
            converterCode += `Babele.get().registerConverters({\n`;

            for (const conf of config) {
                const varName = conf.field;
                const converterName = conf.converter;
                const idKey = conf.idKey || "id";

                converterCode += `    "${converterName}": (${varName}, translations) => {\n`;
                converterCode += `        if (!${varName} || !translations) return ${varName};\n`;
                converterCode += `        \n`;
                converterCode += `        return ${varName}.map(item => {\n`;
                converterCode += `            const translation = translations[item.${idKey}];\n`;
                converterCode += `            \n`;
                converterCode += `            if (translation) {\n`;

                for (const subField of conf.subFields) {
                    converterCode += `                if (translation.${subField}) item.${subField} = translation.${subField};\n`;
                }

                converterCode += `            }\n`;
                converterCode += `            return item;\n`;
                converterCode += `        });\n`;
                converterCode += `    }`;

                // Ajouter une virgule si ce n'est pas le dernier
                if (config.indexOf(conf) < config.length - 1) {
                    converterCode += `,\n\n`;
                } else {
                    converterCode += `\n`;
                }
            }

            converterCode += `});\n`;

            // Afficher dans la console
            console.log("%c═══════════════════════════════════════════", "color: #4CAF50; font-weight: bold;");
            console.log("%cCODE DU CONVERTER GÉNÉRÉ", "color: #4CAF50; font-weight: bold; font-size: 14px;");
            console.log("%c═══════════════════════════════════════════", "color: #4CAF50; font-weight: bold;");
            console.log(converterCode);
            console.log("%c═══════════════════════════════════════════", "color: #4CAF50; font-weight: bold;");

            // Créer un fichier texte avec le converter
            const blob = new Blob([converterCode], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converter-${itemType}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            ui.notifications.info(`📋 Code du converter téléchargé et affiché dans la console (F12) !`);
        }
    }

    // =================================================================
    // LANCEMENT
    // =================================================================
    new BabeleConverterExporter().render(true);
})();