/*
  RoomingKos kinetic type builder for Adobe After Effects
  Usage:
  1. File > Scripts > Run Script File...
  2. Select this JSX file.
  3. A comp named "RK_RoomingKos_Kinetic_1080" will be created.

  Edit `settings.text` or the palette below to tweak the motion.
*/

(function roomingKosKineticType() {
  app.beginUndoGroup("RoomingKos Kinetic Type");

  if (!app.project) {
    app.newProject();
  }

  var settings = {
    text: "RoomingKos",
    compName: "RK_RoomingKos_Kinetic_1080",
    width: 1080,
    height: 1080,
    duration: 6,
    frameRate: 30,
    fontCandidates: [
      "BricolageGrotesque-ExtraBold",
      "Bricolage Grotesque ExtraBold",
      "BricolageGrotesque-Bold",
      "SpaceGrotesk-Bold",
      "Arial-BoldMT"
    ],
    fontSize: 172,
    letterGap: 10,
    baseY: 540,
    letterDelay: 0.06,
    entranceTime: 0.56,
    exitHoldTime: 4.6,
    patternOpacity: 9
  };

  var colors = {
    bg: [247 / 255, 241 / 255, 235 / 255],
    cream: [255 / 255, 251 / 255, 247 / 255],
    sand: [241 / 255, 231 / 255, 220 / 255],
    red: [218 / 255, 31 / 255, 67 / 255],
    slate: [85 / 255, 97 / 255, 115 / 255],
    redSoft: [246 / 255, 216 / 255, 221 / 255]
  };

  function firstFont(doc, candidates) {
    var i;
    for (i = 0; i < candidates.length; i += 1) {
      try {
        doc.font = candidates[i];
        return;
      } catch (err) {}
    }
  }

  function centerAnchor(layer) {
    var rect = layer.sourceRectAtTime(0, false);
    layer.property("Transform").property("Anchor Point").setValue([
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    ]);
  }

  function easeProperty(prop, influence) {
    var dims = 1;
    var value = prop.value;
    var k;
    var inEase = [];
    var outEase = [];

    if (value && value.length !== undefined) {
      dims = value.length;
    }

    for (k = 0; k < dims; k += 1) {
      inEase.push(new KeyframeEase(0, influence));
      outEase.push(new KeyframeEase(0, influence));
    }

    for (k = 1; k <= prop.numKeys; k += 1) {
      prop.setTemporalEaseAtKey(k, inEase, outEase);
    }
  }

  function importStill(pathString) {
    var file = new File(pathString);
    if (!file.exists) {
      return null;
    }

    var importOptions = new ImportOptions(file);
    if (!importOptions.canImportAs(ImportAsType.FOOTAGE)) {
      return null;
    }

    importOptions.importAs = ImportAsType.FOOTAGE;
    return app.project.importFile(importOptions);
  }

  function scaleLayerToCover(layer, comp) {
    var source = layer.source;
    if (!source) {
      return;
    }

    var scaleX = (comp.width / source.width) * 100;
    var scaleY = (comp.height / source.height) * 100;
    var scale = Math.max(scaleX, scaleY);
    layer.property("Transform").property("Scale").setValue([scale, scale]);
    layer.property("Transform").property("Position").setValue([comp.width / 2, comp.height / 2]);
  }

  function addRoundedRect(comp, name, size, position, fillColor, strokeColor, strokeWidth, roundness) {
    var layer = comp.layers.addShape();
    var contents = layer.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    var vectors = group.property("ADBE Vectors Group");
    var rect = vectors.addProperty("ADBE Vector Shape - Rect");
    var fill = vectors.addProperty("ADBE Vector Graphic - Fill");
    var stroke = null;

    layer.name = name;
    rect.property("ADBE Vector Rect Size").setValue(size);
    rect.property("ADBE Vector Rect Roundness").setValue(roundness);
    fill.property("ADBE Vector Fill Color").setValue(fillColor);

    if (strokeColor !== null) {
      stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
      stroke.property("ADBE Vector Stroke Color").setValue(strokeColor);
      stroke.property("ADBE Vector Stroke Width").setValue(strokeWidth);
    }

    layer.property("Transform").property("Position").setValue(position);
    return layer;
  }

  function animatePanel(layer, startTime, finalOpacity) {
    var scale = layer.property("Transform").property("Scale");
    var opacity = layer.property("Transform").property("Opacity");
    var targetOpacity = (finalOpacity === undefined) ? 100 : finalOpacity;

    scale.setValueAtTime(startTime, [88, 88]);
    scale.setValueAtTime(startTime + 0.38, [103, 103]);
    scale.setValueAtTime(startTime + 0.64, [100, 100]);
    opacity.setValueAtTime(startTime, 0);
    opacity.setValueAtTime(startTime + 0.18, targetOpacity);

    easeProperty(scale, 85);
    easeProperty(opacity, 80);
  }

  function addDot(comp, name, size, position, color, startTime) {
    var dot = addRoundedRect(comp, name, [size, size], position, color, null, 0, size);
    var scale = dot.property("Transform").property("Scale");
    var opacity = dot.property("Transform").property("Opacity");

    scale.setValueAtTime(startTime, [0, 0]);
    scale.setValueAtTime(startTime + 0.22, [135, 135]);
    scale.setValueAtTime(startTime + 0.42, [100, 100]);
    opacity.setValueAtTime(startTime, 0);
    opacity.setValueAtTime(startTime + 0.12, 100);
    opacity.setValueAtTime(settings.exitHoldTime, 100);

    easeProperty(scale, 80);
    easeProperty(opacity, 75);
    return dot;
  }

  function addLetterLayer(comp, character, color, fontSize) {
    var layer = comp.layers.addText(character);
    var textDoc = layer.property("Source Text").value;

    textDoc.fontSize = fontSize;
    textDoc.applyFill = true;
    textDoc.applyStroke = false;
    textDoc.fillColor = color;
    textDoc.justification = ParagraphJustification.CENTER_JUSTIFY;
    firstFont(textDoc, settings.fontCandidates);

    layer.property("Source Text").setValue(textDoc);
    centerAnchor(layer);

    return layer;
  }

  var comp = app.project.items.addComp(
    settings.compName,
    settings.width,
    settings.height,
    1,
    settings.duration,
    settings.frameRate
  );
  comp.bgColor = colors.bg;

  var scriptFolder = File($.fileName).parent;
  var projectRoot = scriptFolder.parent;
  var patternPath = projectRoot.fsName + "/ROOMINGKOS BRANDING/Logo/PNG/RK_PATTERN_GREY.png";
  var patternFootage = importStill(patternPath);

  var bg = comp.layers.addSolid(colors.bg, "BG", settings.width, settings.height, 1, settings.duration);
  bg.moveToEnd();

  if (patternFootage) {
    var patternLayer = comp.layers.add(patternFootage);
    patternLayer.name = "Brand Pattern";
    scaleLayerToCover(patternLayer, comp);
    patternLayer.property("Transform").property("Opacity").setValue(settings.patternOpacity);
    patternLayer.blendingMode = BlendingMode.MULTIPLY;
    patternLayer.property("Transform").property("Position").setValueAtTime(0, [settings.width / 2, settings.height / 2 - 20]);
    patternLayer.property("Transform").property("Position").setValueAtTime(settings.duration, [settings.width / 2, settings.height / 2 + 20]);
    easeProperty(patternLayer.property("Transform").property("Position"), 45);
    patternLayer.moveBefore(bg);
  }

  var panelShadow = addRoundedRect(
    comp,
    "Panel Shadow",
    [884, 470],
    [settings.width / 2 + 14, settings.height / 2 + 16],
    colors.slate,
    null,
    0,
    42
  );
  var panel = addRoundedRect(
    comp,
    "Panel",
    [884, 470],
    [settings.width / 2, settings.height / 2],
    colors.cream,
    colors.slate,
    8,
    42
  );

  var blushStrip = addRoundedRect(
    comp,
    "Blush Strip",
    [736, 76],
    [settings.width / 2, 372],
    colors.redSoft,
    null,
    0,
    24
  );
  var underline = addRoundedRect(
    comp,
    "Underline",
    [300, 16],
    [settings.width / 2, 666],
    colors.red,
    null,
    0,
    16
  );

  animatePanel(panelShadow, 0.08, 14);
  animatePanel(panel, 0, 100);
  animatePanel(blushStrip, 0.14, 55);

  var underlineScale = underline.property("Transform").property("Scale");
  var underlineOpacity = underline.property("Transform").property("Opacity");
  underlineScale.setValueAtTime(0.8, [0, 100]);
  underlineScale.setValueAtTime(1.18, [112, 100]);
  underlineScale.setValueAtTime(1.42, [100, 100]);
  underlineOpacity.setValueAtTime(0.8, 0);
  underlineOpacity.setValueAtTime(0.92, 100);
  easeProperty(underlineScale, 88);
  easeProperty(underlineOpacity, 72);

  var dotA = addDot(comp, "Dot Red", 26, [248, 372], colors.red, 0.54);
  var dotB = addDot(comp, "Dot Slate", 18, [820, 716], colors.slate, 0.66);
  var dotC = addDot(comp, "Dot Sand", 22, [860, 342], colors.sand, 0.74);

  var wordNull = comp.layers.addNull();
  wordNull.name = "Word Control";
  wordNull.property("Transform").property("Position").setValue([settings.width / 2, settings.height / 2]);
  wordNull.property("Transform").property("Anchor Point").setValue([50, 50]);

  var letters = [];
  var shadows = [];
  var widths = [];
  var totalWidth = 0;
  var text = settings.text;
  var i;
  var letter;

  for (i = 0; i < text.length; i += 1) {
    letter = text.charAt(i);
    var shadowLayer = addLetterLayer(comp, letter, colors.slate, settings.fontSize);
    var frontLayer = addLetterLayer(comp, letter, colors.red, settings.fontSize);
    var rect = frontLayer.sourceRectAtTime(0, false);

    shadowLayer.name = "Shadow_" + (i + 1) + "_" + letter;
    frontLayer.name = "Letter_" + (i + 1) + "_" + letter;
    shadowLayer.property("Transform").property("Opacity").setValue(24);

    widths.push(rect.width);
    totalWidth += rect.width;

    letters.push(frontLayer);
    shadows.push(shadowLayer);
  }

  if (text.length > 1) {
    totalWidth += settings.letterGap * (text.length - 1);
  }

  var cursor = (settings.width / 2) - (totalWidth / 2);

  for (i = 0; i < text.length; i += 1) {
    var finalX = cursor + (widths[i] / 2);
    var finalY = settings.baseY;
    var shadowPosition = [finalX + 12, finalY + 12];
    var startTime = 0.32 + (i * settings.letterDelay);
    var midTime = startTime + (settings.entranceTime * 0.52);
    var endTime = startTime + settings.entranceTime;
    var spin = (i % 2 === 0) ? -10 : 10;

    var shadowPos = shadows[i].property("Transform").property("Position");
    var letterPos = letters[i].property("Transform").property("Position");
    var letterScale = letters[i].property("Transform").property("Scale");
    var shadowScale = shadows[i].property("Transform").property("Scale");
    var letterOpacity = letters[i].property("Transform").property("Opacity");
    var shadowOpacity = shadows[i].property("Transform").property("Opacity");
    var letterRotation = letters[i].property("Transform").property("Rotation");

    shadowPos.setValueAtTime(startTime, [shadowPosition[0], shadowPosition[1] + 96]);
    shadowPos.setValueAtTime(midTime, [shadowPosition[0], shadowPosition[1] - 10]);
    shadowPos.setValueAtTime(endTime, shadowPosition);

    letterPos.setValueAtTime(startTime, [finalX, finalY + 116]);
    letterPos.setValueAtTime(midTime, [finalX, finalY - 16]);
    letterPos.setValueAtTime(endTime, [finalX, finalY]);

    letterScale.setValueAtTime(startTime, [62, 62]);
    letterScale.setValueAtTime(midTime, [118, 118]);
    letterScale.setValueAtTime(endTime, [100, 100]);

    shadowScale.setValueAtTime(startTime, [54, 54]);
    shadowScale.setValueAtTime(midTime, [112, 112]);
    shadowScale.setValueAtTime(endTime, [100, 100]);

    letterOpacity.setValueAtTime(startTime, 0);
    letterOpacity.setValueAtTime(startTime + 0.12, 100);
    shadowOpacity.setValueAtTime(startTime, 0);
    shadowOpacity.setValueAtTime(startTime + 0.16, 24);
    shadowOpacity.setValueAtTime(settings.exitHoldTime, 24);

    letterRotation.setValueAtTime(startTime, spin);
    letterRotation.setValueAtTime(endTime, 0);

    easeProperty(shadowPos, 88);
    easeProperty(letterPos, 88);
    easeProperty(letterScale, 84);
    easeProperty(shadowScale, 82);
    easeProperty(letterOpacity, 72);
    easeProperty(shadowOpacity, 70);
    easeProperty(letterRotation, 84);

    shadows[i].parent = wordNull;
    letters[i].parent = wordNull;

    cursor += widths[i] + settings.letterGap;
  }

  var nullScale = wordNull.property("Transform").property("Scale");
  var nullPos = wordNull.property("Transform").property("Position");

  nullScale.setValueAtTime(1.32, [100, 100]);
  nullScale.setValueAtTime(1.74, [104, 104]);
  nullScale.setValueAtTime(2.08, [100, 100]);
  nullPos.setValueAtTime(1.32, [settings.width / 2, settings.height / 2]);
  nullPos.setValueAtTime(2.08, [settings.width / 2, settings.height / 2 - 10]);
  nullPos.setValueAtTime(2.5, [settings.width / 2, settings.height / 2]);

  easeProperty(nullScale, 75);
  easeProperty(nullPos, 72);

  dotA.moveBefore(underline);
  dotB.moveBefore(underline);
  dotC.moveBefore(underline);
  underline.moveBefore(wordNull);
  blushStrip.moveBefore(underline);
  panel.moveBefore(blushStrip);
  panelShadow.moveBefore(panel);

  comp.openInViewer();
  app.endUndoGroup();
}());
