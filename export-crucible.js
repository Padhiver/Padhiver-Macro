/**
 * BABELE CONVERTER EXPORTER (ApplicationV2) - VERSION CORRIGÉE
 * 
 * Correction : Export de TOUS les dossiers, même ceux qui ne contiennent
 * que d'autres dossiers (pas de documents directs).
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
                ["Item", "Actor", "JournalEntry"].includes(p.metadata.type)
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
                                Seuls les champs simples (nom, description) seront exportés.
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

            // Traiter chaque document
            for (const doc of documents) {
                const originalName = doc.name;
                const docData = doc.toObject();

                const itemTranslation = {
                    "name": originalName
                };

                // Ajouter description seulement si ce n'est pas un JournalEntry
                if (pack.metadata.type !== "JournalEntry") {
                    itemTranslation["description"] = foundry.utils.getProperty(docData, "system.description") || "";
                }

                // Traiter les structures complexes
                for (const conf of config) {
                    const array = foundry.utils.getProperty(docData, conf.path);

                    if (Array.isArray(array) && array.length > 0) {
                        const nestedObject = {};

                        for (const element of array) {
                            const id = element[conf.idKey || "id"];
                            if (!id) continue;

                            const elementTranslation = {};
                            for (const subField of conf.subFields) {
                                const value = foundry.utils.getProperty(element, subField);
                                if (value && (typeof value === 'string' && value.trim() !== "")) {
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
                        if (page.text?.content) {
                            pageTranslation["text"] = page.text.content;
                        }

                        pagesData[page.name] = pageTranslation;
                    }

                    if (Object.keys(pagesData).length > 0) {
                        itemTranslation["pages"] = pagesData;
                    }
                }

                entriesData[originalName] = itemTranslation;
            }

            // Créer le mapping
            const mapping = {};

            // Ajouter description seulement si ce n'est pas un JournalEntry
            if (pack.metadata.type !== "JournalEntry") {
                mapping["description"] = "system.description";
            }

            for (const conf of config) {
                mapping[conf.field] = {
                    "path": conf.path,
                    "converter": conf.converter
                };
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
            if (config.length > 0) {
                BabeleConverterExporter.generateConverter(config, itemType);
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