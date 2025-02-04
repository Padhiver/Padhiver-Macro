// Récupérer tous les acteurs du compendium sélectionné et les formater
async function formatActorsFromCompendium() {
    // Récupérer tous les compendiums
    const packs = game.packs.filter(p => p.documentName === "Actor");

    // Créer le contenu du dialogue avec les options
    const content = `
        <form>
            <div class="form-group">
                <label>Sélectionner le Compendium :</label>
                <select name="packChoice" id="packChoice" style="margin-bottom: 10px;">
                    ${packs.map(p => `<option value="${p.collection}">${p.title}</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label><strong>Options de sortie :</strong></label>
                <div style="margin-left: 10px; margin-top: 5px;">
                    <div>
                        <label>
                            <input type="checkbox" name="includeCount" checked>
                            Inclure le nombre total d'acteurs
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" name="includeComments" checked>
                            Inclure les noms des acteurs comme commentaires
                        </label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label><strong>Données à inclure :</strong></label>
                <div style="margin-left: 10px; margin-top: 5px;">
                    <div>
                        <label>
                            <input type="checkbox" name="includeActorImg" checked>
                            Image de l'acteur
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" name="includeTokenImg" checked>
                            Image du jeton
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" name="includeScales" checked>
                            Échelles du jeton (lorsqu'elles ne sont pas égales à 1)
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="checkbox" name="includeRing" checked>
                            Données de l'anneau
                        </label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label><strong>Options de tri :</strong></label>
                <div style="margin-left: 10px; margin-top: 5px;">
                    <div>
                        <label>
                            <input type="radio" name="sortOrder" value="alpha" checked>
                            Par ordre alphabétique
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="radio" name="sortOrder" value="id">
                            Par ID
                        </label>
                    </div>
                    <div>
                        <label>
                            <input type="radio" name="sortOrder" value="none">
                            Aucun tri
                        </label>
                    </div>
                </div>
            </div>
        </form>
    `;

    // Créer et afficher le dialogue
    new Dialog({
        title: "Options d'exportation du Compendium",
        content: content,
        buttons: {
            process: {
                label: "Générer le JSON",
                callback: async (html) => {
                    // Récupérer toutes les options
                    const options = {
                        packId: html.find('[name="packChoice"]').val(),
                        includeCount: html.find('[name="includeCount"]').prop('checked'),
                        includeComments: html.find('[name="includeComments"]').prop('checked'),
                        includeActorImg: html.find('[name="includeActorImg"]').prop('checked'),
                        includeTokenImg: html.find('[name="includeTokenImg"]').prop('checked'),
                        includeScales: html.find('[name="includeScales"]').prop('checked'),
                        includeRing: html.find('[name="includeRing"]').prop('checked'),
                        sortOrder: html.find('[name="sortOrder"]:checked').val()
                    };

                    const pack = game.packs.get(options.packId);
                    const actors = await pack.getDocuments();

                    let actorsArray = [];

                    for (let actor of actors) {
                        // Récupérer les données du jeton
                        const tokenData = actor.prototypeToken;
                        const textureData = tokenData.texture;

                        // Créer la structure de base en fonction des options
                        const actorEntry = {};

                        if (options.includeActorImg) {
                            actorEntry.actor = actor.img;
                        }

                        if (options.includeTokenImg || options.includeScales || options.includeRing) {
                            actorEntry.token = {
                                texture: {}
                            };

                            if (options.includeTokenImg) {
                                actorEntry.token.texture.src = textureData.src;
                            }

                            if (options.includeScales && (textureData.scaleX !== 1 || textureData.scaleY !== 1)) {
                                if (textureData.scaleX !== 1) actorEntry.token.texture.scaleX = textureData.scaleX;
                                if (textureData.scaleY !== 1) actorEntry.token.texture.scaleY = textureData.scaleY;
                            }

                            if (options.includeRing) {
                                actorEntry.token.ring = {
                                    enabled: false
                                };
                            }
                        }

                        // Stocker les données de l'acteur avec son nom et son ID pour le tri
                        actorsArray.push({
                            name: actor.name,
                            id: actor.id,
                            data: actorEntry
                        });
                    }

                    // Trier le tableau en fonction de l'option sélectionnée
                    if (options.sortOrder === 'alpha') {
                        actorsArray.sort((a, b) => a.name.localeCompare(b.name));
                    } else if (options.sortOrder === 'id') {
                        actorsArray.sort((a, b) => a.id.localeCompare(b.id));
                    }

                    // Formater la sortie avec des commentaires
                    let formattedOutput = "{\n";
                    if (options.includeCount) {
                        formattedOutput += `    // Nombre total d'acteurs : ${actors.length}\n\n`;
                    }

                    for (const actorInfo of actorsArray) {
                        if (options.includeComments) {
                            formattedOutput += `    // ${actorInfo.name}\n`;
                        }
                        formattedOutput += `    "${actorInfo.id}": ${JSON.stringify(actorInfo.data, null, 2)},\n\n`;
                    }
                    formattedOutput = formattedOutput.slice(0, -2) + "\n}"; // Supprimer la dernière virgule et fermer l'accolade

                    // Créer un blob et télécharger le fichier
                    const blob = new Blob([formattedOutput], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${pack.title}-actors.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(a.href);

                    // Afficher une notification de succès
                    ui.notifications.info(`Le fichier JSON a été téléchargé ! Il contient ${actors.length} acteurs.`);

                    // Afficher également dans la console
                    console.log(formattedOutput);
                }
            },
            cancel: {
                label: "Annuler"
            }
        },
        default: "process",
        width: 400
    }).render(true);
}

// Exécuter la fonction
formatActorsFromCompendium();