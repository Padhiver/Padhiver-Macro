/**
 * BABELE CONFIG GENERATOR
 * 
 * Analyse un compendium et génère automatiquement la configuration
 * pour EXPORT_CONFIG basée sur les champs traduisibles détectés.
 */

(async () => {
    
    // =================================================================
    // UTILITAIRES D'ANALYSE
    // =================================================================
    
    /**
     * Analyse récursive d'un objet pour trouver tous les champs traduisibles
     */
    function analyzeObject(obj, path = "", results = new Map()) {
        if (!obj || typeof obj !== 'object') return results;
        
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            // Détecter les champs texte traduisibles
            if (typeof value === 'string' && value.trim().length > 0) {
                const fieldInfo = results.get(currentPath) || {
                    path: currentPath,
                    type: 'string',
                    samples: [],
                    count: 0
                };
                
                fieldInfo.count++;
                if (fieldInfo.samples.length < 3 && !fieldInfo.samples.includes(value)) {
                    fieldInfo.samples.push(value.substring(0, 50) + (value.length > 50 ? '...' : ''));
                }
                
                results.set(currentPath, fieldInfo);
            }
            // Détecter les tableaux d'objets
            else if (Array.isArray(value) && value.length > 0) {
                const firstElement = value[0];
                
                if (typeof firstElement === 'object' && firstElement !== null) {
                    // C'est un tableau d'objets, analyser sa structure
                    const arrayInfo = {
                        path: currentPath,
                        type: 'array',
                        length: value.length,
                        subFields: new Map(),
                        hasId: false,
                        idKey: null
                    };
                    
                    // Détecter la clé d'identification
                    for (const idCandidate of ['id', '_id', 'uuid', 'key', 'name']) {
                        if (firstElement[idCandidate] !== undefined) {
                            arrayInfo.hasId = true;
                            arrayInfo.idKey = idCandidate;
                            break;
                        }
                    }
                    
                    // Analyser les sous-champs de tous les éléments
                    for (const element of value) {
                        for (const [subKey, subValue] of Object.entries(element)) {
                            if (typeof subValue === 'string' && subValue.trim().length > 0) {
                                const subFieldInfo = arrayInfo.subFields.get(subKey) || {
                                    name: subKey,
                                    samples: [],
                                    count: 0
                                };
                                
                                subFieldInfo.count++;
                                if (subFieldInfo.samples.length < 2 && !subFieldInfo.samples.includes(subValue)) {
                                    subFieldInfo.samples.push(subValue.substring(0, 40) + (subValue.length > 40 ? '...' : ''));
                                }
                                
                                arrayInfo.subFields.set(subKey, subFieldInfo);
                            }
                        }
                    }
                    
                    if (arrayInfo.subFields.size > 0) {
                        results.set(currentPath, arrayInfo);
                    }
                }
            }
            // Récursion pour les objets imbriqués
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                analyzeObject(value, currentPath, results);
            }
        }
        
        return results;
    }
    
    // =================================================================
    // APPLICATION DE CONFIGURATION
    // =================================================================
    
    class BabeleConfigGenerator extends foundry.applications.api.ApplicationV2 {
        
        constructor(options = {}) {
            super(options);
            this.packs = game.packs.filter(p => 
                ["Item", "Actor", "JournalEntry"].includes(p.metadata.type)
            );
            this.selectedPack = null;
            this.analysisResults = null;
            this.selectedFields = new Set();
        }
        
        static DEFAULT_OPTIONS = {
            id: "babele-config-generator",
            tag: "form",
            window: {
                title: "Générateur de Configuration Babele",
                icon: "fa-solid fa-wand-magic-sparkles",
                resizable: true
            },
            position: {
                width: 800,
                height: 600
            },
            actions: {
                analyze: BabeleConfigGenerator.onAnalyze,
                generate: BabeleConfigGenerator.onGenerate,
                toggleField: BabeleConfigGenerator.onToggleField,
                toggleArrayField: BabeleConfigGenerator.onToggleArrayField
            }
        };
        
        static PARTS = {
            form: {
                template: "templates/generic/tab-navigation.html"
            }
        };
        
        async _prepareContext(options) {
            const context = await super._prepareContext(options);
            
            const compendiumOptions = this.packs.map(p => ({
                value: p.metadata.id,
                label: `${p.metadata.label} (${p.metadata.id})`,
                type: p.metadata.type
            }));
            
            return {
                ...context,
                compendiums: compendiumOptions,
                selectedPack: this.selectedPack,
                analysisResults: this.analysisResults,
                selectedFields: this.selectedFields
            };
        }
        
        _renderHTML(context, options) {
            let html = `
                <div class="babele-config-generator" style="padding: 1rem; height: 100%; display: flex; flex-direction: column;">
                    <!-- Sélection du compendium -->
                    <section style="margin-bottom: 1rem; flex-shrink: 0;">
                        <h3 style="border-bottom: 2px solid var(--color-border-dark); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fa-solid fa-database"></i> Analyser un Compendium
                        </h3>
                        <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                            <div style="flex: 1;">
                                <label for="compendium-select" style="font-weight: bold; display: block; margin-bottom: 0.25rem;">
                                    Sélectionnez un compendium :
                                </label>
                                <select id="compendium-select" name="compendium" style="width: 100%; padding: 0.5rem;">
                                    ${context.compendiums.map(c => 
                                        `<option value="${c.value}">${c.label}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <button type="button" data-action="analyze" style="padding: 0.5rem 1rem; white-space: nowrap;">
                                <i class="fa-solid fa-magnifying-glass"></i> Analyser
                            </button>
                        </div>
                    </section>
            `;
            
            // Résultats de l'analyse
            if (context.analysisResults) {
                html += `
                    <section style="flex: 1; overflow-y: auto; margin-bottom: 1rem;">
                        <h3 style="border-bottom: 2px solid var(--color-border-dark); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
                            <i class="fa-solid fa-list-check"></i> Champs Traduisibles Détectés
                        </h3>
                        <div id="fields-list">
                `;
                
                for (const [path, info] of context.analysisResults) {
                    const fieldId = path.replace(/\./g, '_');
                    const isSelected = context.selectedFields.has(path);
                    
                    if (info.type === 'string') {
                        html += `
                            <div class="field-item" style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.1); border-radius: 4px;">
                                <label style="display: flex; align-items: start; cursor: pointer;">
                                    <input type="checkbox" 
                                           data-action="toggleField"
                                           data-path="${path}" 
                                           ${isSelected ? 'checked' : ''}
                                           style="margin-right: 0.5rem; margin-top: 0.25rem;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold; color: #4CAF50;">
                                            <i class="fa-solid fa-font"></i> ${path}
                                        </div>
                                        <div style="font-size: 0.85em; color: #999; margin-top: 0.25rem;">
                                            Champ texte simple • Trouvé ${info.count} fois
                                        </div>
                                        ${info.samples.length > 0 ? `
                                            <div style="font-size: 0.8em; margin-top: 0.5rem; padding: 0.5rem; background: rgba(0,0,0,0.2); border-radius: 3px; font-family: monospace;">
                                                Exemple: "${info.samples[0]}"
                                            </div>
                                        ` : ''}
                                    </div>
                                </label>
                            </div>
                        `;
                    } else if (info.type === 'array') {
                        const arraySelected = context.selectedFields.has(path);
                        html += `
                            <div class="field-item array-field" style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(33,150,243,0.1); border: 2px solid #2196F3; border-radius: 4px;">
                                <label style="display: flex; align-items: start; cursor: pointer;">
                                    <input type="checkbox" 
                                           data-action="toggleField"
                                           data-path="${path}" 
                                           ${arraySelected ? 'checked' : ''}
                                           style="margin-right: 0.5rem; margin-top: 0.25rem;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold; color: #2196F3;">
                                            <i class="fa-solid fa-list"></i> ${path}
                                        </div>
                                        <div style="font-size: 0.85em; color: #999; margin-top: 0.25rem;">
                                            Tableau d'objets • ${info.length} éléments • 
                                            ${info.hasId ? `ID: <code>${info.idKey}</code>` : '<span style="color: #f44336;">⚠ Pas d\'ID détecté</span>'}
                                        </div>
                                        
                                        ${arraySelected ? `
                                            <div style="margin-top: 0.75rem; padding-left: 1.5rem; border-left: 3px solid #2196F3;">
                                                <div style="font-size: 0.9em; font-weight: bold; margin-bottom: 0.5rem;">
                                                    Sous-champs à inclure :
                                                </div>
                                                ${Array.from(info.subFields.entries()).map(([subKey, subInfo]) => {
                                                    const subPath = `${path}.${subKey}`;
                                                    const subSelected = context.selectedFields.has(subPath);
                                                    return `
                                                        <label style="display: block; margin-bottom: 0.5rem; cursor: pointer;">
                                                            <input type="checkbox"
                                                                   data-action="toggleArrayField"
                                                                   data-parent="${path}"
                                                                   data-field="${subKey}"
                                                                   ${subSelected ? 'checked' : ''}
                                                                   style="margin-right: 0.5rem;">
                                                            <strong>${subKey}</strong>
                                                            <span style="color: #999; font-size: 0.85em;">
                                                                (${subInfo.count} fois)
                                                            </span>
                                                            ${subInfo.samples.length > 0 ? `
                                                                <div style="font-size: 0.75em; margin-left: 1.5rem; margin-top: 0.25rem; color: #666; font-family: monospace;">
                                                                    "${subInfo.samples[0]}"
                                                                </div>
                                                            ` : ''}
                                                        </label>
                                                    `;
                                                }).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </label>
                            </div>
                        `;
                    }
                }
                
                html += `
                        </div>
                    </section>
                    
                    <!-- Bouton de génération -->
                    <section style="flex-shrink: 0;">
                        <button type="button" data-action="generate" style="width: 100%; padding: 0.75rem; font-size: 1rem;">
                            <i class="fa-solid fa-code"></i> Générer la Configuration
                        </button>
                    </section>
                `;
            } else {
                html += `
                    <section style="flex: 1; display: flex; align-items: center; justify-content: center;">
                        <div style="text-align: center; color: #999;">
                            <i class="fa-solid fa-arrow-up" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                            <p style="font-size: 1.1em;">Sélectionnez un compendium et cliquez sur "Analyser"</p>
                        </div>
                    </section>
                `;
            }
            
            html += `</div>`;
            
            return { form: html };
        }
        
        _replaceHTML(result, content, options) {
            content.innerHTML = result.form;
        }
        
        static async onAnalyze(event, target) {
            const app = this;
            const form = target.closest("form");
            const select = form.querySelector("#compendium-select");
            const packId = select.value;
            
            if (!packId) {
                ui.notifications.error("Aucun compendium sélectionné.");
                return;
            }
            
            const pack = game.packs.get(packId);
            if (!pack) {
                ui.notifications.error(`Compendium introuvable : ${packId}`);
                return;
            }
            
            ui.notifications.info(`Analyse de ${pack.metadata.label} en cours...`);
            
            const documents = await pack.getDocuments();
            if (!documents.length) {
                ui.notifications.warn("Le compendium est vide.");
                return;
            }
            
            // Analyser tous les documents
            const globalResults = new Map();
            
            for (const doc of documents) {
                const docData = doc.toObject();
                analyzeObject(docData, "", globalResults);
            }
            
            // Filtrer les résultats pertinents
            const filteredResults = new Map();
            for (const [path, info] of globalResults) {
                // Exclure les champs système non traduisibles
                if (path.startsWith('_id') || path.startsWith('flags') || 
                    path.startsWith('ownership') || path.startsWith('sort')) {
                    continue;
                }
                
                // Pour les strings, garder seulement si présent dans au moins 50% des docs
                if (info.type === 'string' && info.count >= documents.length * 0.5) {
                    filteredResults.set(path, info);
                }
                // Pour les arrays, toujours garder
                else if (info.type === 'array') {
                    filteredResults.set(path, info);
                }
            }
            
            app.selectedPack = pack;
            app.analysisResults = filteredResults;
            app.selectedFields.clear();
            
            // Pré-sélectionner name et description
            if (filteredResults.has('name')) app.selectedFields.add('name');
            if (filteredResults.has('system.description')) app.selectedFields.add('system.description');
            
            ui.notifications.info(`✅ ${filteredResults.size} champs traduisibles détectés !`);
            
            app.render();
        }
        
        static onToggleField(event, target) {
            const app = this;
            const path = target.dataset.path;
            
            if (target.checked) {
                app.selectedFields.add(path);
                
                // Si c'est un array, pré-sélectionner name et description des sous-champs
                const info = app.analysisResults.get(path);
                if (info && info.type === 'array') {
                    for (const [subKey] of info.subFields) {
                        if (subKey === 'name' || subKey === 'description') {
                            app.selectedFields.add(`${path}.${subKey}`);
                        }
                    }
                }
            } else {
                app.selectedFields.delete(path);
                
                // Si c'est un array, déselectionner tous ses sous-champs
                const info = app.analysisResults.get(path);
                if (info && info.type === 'array') {
                    for (const [subKey] of info.subFields) {
                        app.selectedFields.delete(`${path}.${subKey}`);
                    }
                }
            }
            
            app.render();
        }
        
        static onToggleArrayField(event, target) {
            const app = this;
            const parent = target.dataset.parent;
            const field = target.dataset.field;
            const fullPath = `${parent}.${field}`;
            
            if (target.checked) {
                app.selectedFields.add(fullPath);
            } else {
                app.selectedFields.delete(fullPath);
            }
        }
        
        static async onGenerate(event, target) {
            const app = this;
            
            if (!app.selectedPack || !app.analysisResults) {
                ui.notifications.error("Veuillez d'abord analyser un compendium.");
                return;
            }
            
            if (app.selectedFields.size === 0) {
                ui.notifications.warn("Aucun champ sélectionné.");
                return;
            }
            
            // Générer la configuration
            const config = [];
            const arrayFields = new Map();
            
            // Regrouper les sous-champs par array parent
            for (const path of app.selectedFields) {
                const info = app.analysisResults.get(path);
                
                if (info && info.type === 'array') {
                    const subFields = [];
                    
                    for (const selectedPath of app.selectedFields) {
                        if (selectedPath.startsWith(path + '.')) {
                            const subField = selectedPath.substring(path.length + 1);
                            subFields.push(subField);
                        }
                    }
                    
                    if (subFields.length > 0) {
                        const fieldName = path.split('.').pop();
                        config.push({
                            field: fieldName,
                            path: path,
                            converter: `${fieldName}_converter`,
                            subFields: subFields,
                            idKey: info.idKey || "id"
                        });
                    }
                }
            }
            
            // Générer le code
            let itemType = app.selectedPack.metadata.type;
            if (itemType === "Item") {
                const docs = await app.selectedPack.getDocuments();
                if (docs.length > 0) {
                    itemType = docs[0].type;
                }
            }
            
            let code = `// ============================================\n`;
            code += `// Configuration générée pour : ${app.selectedPack.metadata.label}\n`;
            code += `// Type: ${itemType}\n`;
            code += `// ============================================\n\n`;
            code += `// À ajouter dans EXPORT_CONFIG au début de la macro d'export :\n\n`;
            code += `"${itemType}": [\n`;
            
            config.forEach((conf, index) => {
                code += `    {\n`;
                code += `        field: "${conf.field}",\n`;
                code += `        path: "${conf.path}",\n`;
                code += `        converter: "${conf.converter}",\n`;
                code += `        subFields: [${conf.subFields.map(f => `"${f}"`).join(', ')}],\n`;
                code += `        idKey: "${conf.idKey}"\n`;
                code += `    }${index < config.length - 1 ? ',' : ''}\n`;
            });
            
            code += `]\n`;
            
            // Afficher dans la console
            console.log("%c═══════════════════════════════════════════", "color: #2196F3; font-weight: bold;");
            console.log("%cCONFIGURATION GÉNÉRÉE", "color: #2196F3; font-weight: bold; font-size: 14px;");
            console.log("%c═══════════════════════════════════════════", "color: #2196F3; font-weight: bold;");
            console.log(code);
            console.log("%c═══════════════════════════════════════════", "color: #2196F3; font-weight: bold;");
            
            // Télécharger le fichier
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `config-${itemType}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ui.notifications.info(`✅ Configuration générée et téléchargée !`);
            
            // Copier dans le presse-papier
            try {
                await navigator.clipboard.writeText(code);
                ui.notifications.info(`📋 Configuration copiée dans le presse-papier !`);
            } catch (err) {
                console.warn("Impossible de copier dans le presse-papier", err);
            }
        }
    }
    
    // =================================================================
    // LANCEMENT
    // =================================================================
    new BabeleConfigGenerator().render(true);
})();