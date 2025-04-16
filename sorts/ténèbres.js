if (game.user !== game.users.activeGM) return game.socket.emit(SOCKETID, { type: "darknessSpell", request: "darkness" });
    const template = canvas.templates.placeables.at(-1);
    const darkness = {
      x: template.center.x,
      y: template.center.y,
      radius: template.center.radius,
      config: { bright: 4.5, negative: true }
    };
    canvas.scene.createEmbeddedDocuments("AmbientLight", [darkness]);