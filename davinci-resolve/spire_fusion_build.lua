-- Spire branded motion banner builder for DaVinci Resolve / Fusion.
-- Run this on a fresh Fusion Composition that only contains MediaOut.

local fusionApp = fusion or fu or Fusion()
local activeComp = composition or comp or (fusionApp and fusionApp:GetCurrentComp())

if not activeComp then
  error("Open a Fusion Composition in the Fusion page first.")
end

local comp = activeComp
local FPS = 30

local palette = {
  cream = {249 / 255, 247 / 255, 244 / 255},
  paper = {255 / 255, 255 / 255, 255 / 255},
  tint = {236 / 255, 244 / 255, 236 / 255},
  ink = {0 / 255, 41 / 255, 31 / 255},
  inkSoft = {16 / 255, 57 / 255, 47 / 255},
  green = {52 / 255, 245 / 255, 116 / 255},
  mint = {190 / 255, 255 / 255, 176 / 255},
  yellow = {255 / 255, 215 / 255, 95 / 255},
  red = {255 / 255, 107 / 255, 107 / 255}
}

local function frames(seconds)
  return math.floor((seconds * FPS) + 0.5)
end

local function point(x, y)
  return {x, y}
end

local function firstByRegID(regid)
  local list = comp:GetToolList(false, regid) or {}
  for _, tool in pairs(list) do
    return tool
  end

  return nil
end

local function nonMediaOutCount()
  local count = 0
  local tools = comp:GetToolList(false) or {}

  for _, tool in pairs(tools) do
    local regid = tool:GetAttrs("TOOLS_RegID")
    if regid ~= "MediaOut" then
      count = count + 1
    end
  end

  return count
end

local function rename(tool, name)
  pcall(function()
    tool:SetAttrs({TOOLS_Name = name})
  end)
end

local function setInput(tool, key, value)
  local ok = pcall(function()
    tool[key] = value
  end)

  if ok then
    return true
  end

  ok = pcall(function()
    tool:SetInput(key, value)
  end)

  return ok
end

local function outputOf(tool)
  return tool:FindMainOutput(1)
end

local function connect(tool, inputName, sourceTool)
  local inputHandle = tool[inputName]
  if not inputHandle then
    error("Missing input '" .. inputName .. "' on " .. tostring(tool.Name))
  end

  inputHandle:ConnectTo(outputOf(sourceTool))
end

local function connectMainInput(tool, sourceTool)
  local inputHandle = tool:FindMainInput(1)
  if not inputHandle then
    error("Missing main input on " .. tostring(tool.Name))
  end

  inputHandle:ConnectTo(outputOf(sourceTool))
end

local function animateNumber(tool, key, keys)
  local spline = BezierSpline({})
  tool[key] = spline

  for frame, value in pairs(keys) do
    spline[frame] = value
  end

  return spline
end

local function animatePoint(tool, key, keys)
  local ok, path = pcall(function()
    return Path({})
  end)

  if not ok then
    ok, path = pcall(function()
      return Path{}
    end)
  end

  if not ok then
    local lastFrame = nil
    local lastValue = nil

    for frame, value in pairs(keys) do
      if lastFrame == nil or frame > lastFrame then
        lastFrame = frame
        lastValue = value
      end
    end

    if lastValue then
      setInput(tool, key, lastValue)
    end

    return nil
  end

  tool[key] = path
  for frame, value in pairs(keys) do
    path[frame] = value
  end

  return path
end

local function addBackground(name, color, x, y)
  local node = comp:AddTool("Background", x, y)
  rename(node, name)
  setInput(node, "UseFrameFormatSettings", 1)
  setInput(node, "TopLeftRed", color[1])
  setInput(node, "TopLeftGreen", color[2])
  setInput(node, "TopLeftBlue", color[3])
  setInput(node, "TopLeftAlpha", 1)
  return node
end

local function addRectangleMask(name, width, height, centerX, centerY, cornerRadius, x, y)
  local mask = comp:AddTool("RectangleMask", x, y)
  rename(mask, name)
  setInput(mask, "Filter", 1)
  setInput(mask, "Width", width)
  setInput(mask, "Height", height)
  setInput(mask, "Center", point(centerX, centerY))
  setInput(mask, "CornerRadius", cornerRadius)
  return mask
end

local function addEllipseMask(name, width, height, centerX, centerY, x, y)
  local mask = comp:AddTool("EllipseMask", x, y)
  rename(mask, name)
  setInput(mask, "Filter", 1)
  setInput(mask, "Width", width)
  setInput(mask, "Height", height)
  setInput(mask, "Center", point(centerX, centerY))
  return mask
end

local function addTransform(name, sourceTool, x, y)
  local tx = comp:AddTool("Transform", x, y)
  rename(tx, name)
  connectMainInput(tx, sourceTool)
  return tx
end

local function addMerge(name, backgroundTool, foregroundTool, x, y)
  local merge = comp:AddTool("Merge", x, y)
  rename(merge, name)
  connect(merge, "Background", backgroundTool)
  connect(merge, "Foreground", foregroundTool)
  return merge
end

local function addMaskedBackground(name, color, mask, x, y)
  local bg = addBackground(name, color, x, y)
  connect(bg, "EffectMask", mask)
  return bg
end

local function addText(name, textValue, color, size, x, y)
  local text = comp:AddTool("TextPlus", x, y)
  rename(text, name)
  setInput(text, "StyledText", textValue)
  setInput(text, "Font", "Sharp Grotesk")
  setInput(text, "Style", "Black 20")
  setInput(text, "Size", size)
  setInput(text, "Center", point(0.5, 0.5))
  setInput(text, "HorizontalJustificationNew", 3)
  setInput(text, "VerticalJustificationNew", 3)
  setInput(text, "Red1", color[1])
  setInput(text, "Green1", color[2])
  setInput(text, "Blue1", color[3])
  setInput(text, "Alpha1", 1)
  setInput(text, "WriteOnEnd", 1)
  return text
end

local function addPill(name, color, width, height, centerX, centerY, radius, x, y)
  local mask = addRectangleMask(name .. "Mask", width, height, centerX, centerY, radius, x - 4, y)
  return addMaskedBackground(name, color, mask, x, y)
end

local function addDot(name, color, size, centerX, centerY, x, y)
  local mask = addEllipseMask(name .. "Mask", size, size, centerX, centerY, x - 4, y)
  return addMaskedBackground(name, color, mask, x, y)
end

if nonMediaOutCount() > 0 then
  error("Use this script on a fresh Fusion Composition. The current comp already has tools besides MediaOut.")
end

local mediaOut = firstByRegID("MediaOut")
if not mediaOut then
  mediaOut = comp:AddTool("MediaOut", 24, 0)
end

comp:Lock()

local ok, buildError = pcall(function()
  local bg = addBackground("Spire_BG", palette.cream, -22, 0)

  local panelShadow = addPill("Spire_PanelShadow", palette.ink, 0.84, 0.44, 0.515, 0.505, 0.08, -18, 3)
  local panelShadowTx = addTransform("Spire_PanelShadowTx", panelShadow, -14, 3)
  local merge = addMerge("Spire_MergePanelShadow", bg, panelShadowTx, -10, 2)
  animateNumber(merge, "Blend", {
    [frames(0.08)] = 0.00,
    [frames(0.26)] = 0.13
  })

  local panel = addPill("Spire_Panel", palette.paper, 0.84, 0.44, 0.5, 0.5, 0.08, -18, 0)
  local panelTx = addTransform("Spire_PanelTx", panel, -14, 0)
  merge = addMerge("Spire_MergePanel", merge, panelTx, -10, 0)
  animateNumber(panelTx, "Size", {
    [frames(0.00)] = 0.88,
    [frames(0.38)] = 1.03,
    [frames(0.64)] = 1.00
  })
  animateNumber(merge, "Blend", {
    [frames(0.00)] = 0.00,
    [frames(0.18)] = 1.00
  })

  local glow = addPill("Spire_WordmarkGlow", palette.mint, 0.48, 0.13, 0.5, 0.455, 0.08, -18, -3)
  local glowTx = addTransform("Spire_WordmarkGlowTx", glow, -14, -3)
  merge = addMerge("Spire_MergeGlow", merge, glowTx, -10, -3)
  animateNumber(merge, "Blend", {
    [frames(2.20)] = 0.00,
    [frames(2.76)] = 0.42
  })

  local lightHousing = addPill("Spire_StartLightsHousing", palette.ink, 0.12, 0.052, 0.5, 0.355, 0.04, -18, -6)
  merge = addMerge("Spire_MergeLightHousing", merge, lightHousing, -10, -6)
  animateNumber(merge, "Blend", {
    [frames(0.18)] = 0.00,
    [frames(0.34)] = 1.00
  })

  local lights = {
    {name = "Red", color = palette.red, x = 0.47, delay = 0.30},
    {name = "Yellow", color = palette.yellow, x = 0.50, delay = 0.72},
    {name = "Green", color = palette.green, x = 0.53, delay = 1.14}
  }

  for index, light in ipairs(lights) do
    local dot = addDot("Spire_StartLight" .. light.name, light.color, 0.018, light.x, 0.355, -18, -7 - index)
    local dotTx = addTransform("Spire_StartLight" .. light.name .. "Tx", dot, -14, -7 - index)
    merge = addMerge("Spire_MergeStartLight" .. light.name, merge, dotTx, -10, -7 - index)
    animateNumber(dotTx, "Size", {
      [frames(light.delay)] = 0.10,
      [frames(light.delay + 0.20)] = 1.28,
      [frames(light.delay + 0.36)] = 1.00
    })
    animateNumber(merge, "Blend", {
      [frames(light.delay)] = 0.00,
      [frames(light.delay + 0.10)] = 1.00
    })
  end

  local track = addPill("Spire_Track", palette.inkSoft, 0.66, 0.035, 0.5, 0.665, 0.04, -18, -12)
  local trackTx = addTransform("Spire_TrackTx", track, -14, -12)
  merge = addMerge("Spire_MergeTrack", merge, trackTx, -10, -12)
  animateNumber(trackTx, "Size", {
    [frames(1.48)] = 0.72,
    [frames(1.86)] = 1.04,
    [frames(2.08)] = 1.00
  })
  animateNumber(merge, "Blend", {
    [frames(1.48)] = 0.00,
    [frames(1.62)] = 1.00
  })

  local finish = addPill("Spire_FinishStrip", palette.paper, 0.06, 0.045, 0.69, 0.665, 0.01, -18, -15)
  merge = addMerge("Spire_MergeFinishStrip", merge, finish, -10, -15)
  animateNumber(merge, "Blend", {
    [frames(5.18)] = 0.00,
    [frames(5.42)] = 1.00
  })

  local shadow = addText("Spire_TextShadow", "SPIRE", palette.inkSoft, 0.18, -18, -18)
  local shadowTx = addTransform("Spire_TextShadowTx", shadow, -14, -18)
  merge = addMerge("Spire_MergeTextShadow", merge, shadowTx, -10, -18)
  setInput(shadowTx, "Center", point(0.505, 0.495))
  animateNumber(merge, "Blend", {
    [frames(2.20)] = 0.00,
    [frames(2.72)] = 0.18
  })

  local letters = {
    {value = "S", x = 0.36, y = 0.49, enter = point(0.31, 0.53), angle = -12, delay = 2.28},
    {value = "P", x = 0.43, y = 0.49, enter = point(0.41, 0.43), angle = 9, delay = 2.42},
    {value = "I", x = 0.50, y = 0.49, enter = point(0.50, 0.55), angle = -6, delay = 2.56},
    {value = "R", x = 0.57, y = 0.49, enter = point(0.59, 0.43), angle = 8, delay = 2.70},
    {value = "E", x = 0.64, y = 0.49, enter = point(0.69, 0.52), angle = 12, delay = 2.84}
  }

  for index, letter in ipairs(letters) do
    local text = addText("Spire_Letter_" .. letter.value, letter.value, palette.ink, 0.18, -18, -20 - index)
    local textTx = addTransform("Spire_Letter_" .. letter.value .. "Tx", text, -14, -20 - index)
    merge = addMerge("Spire_MergeLetter_" .. letter.value, merge, textTx, -10, -20 - index)

    animateNumber(textTx, "Size", {
      [frames(letter.delay)] = 0.62,
      [frames(letter.delay + 0.32)] = 1.10,
      [frames(letter.delay + 0.56)] = 1.00
    })
    animatePoint(textTx, "Center", {
      [frames(letter.delay)] = letter.enter,
      [frames(letter.delay + 0.34)] = point(letter.x, letter.y - 0.014),
      [frames(letter.delay + 0.58)] = point(letter.x, letter.y)
    })
    animateNumber(textTx, "Angle", {
      [frames(letter.delay)] = letter.angle,
      [frames(letter.delay + 0.58)] = 0
    })
    animateNumber(merge, "Blend", {
      [frames(letter.delay)] = 0.00,
      [frames(letter.delay + 0.12)] = 1.00
    })
  end

  connectMainInput(mediaOut, merge)
end)

comp:Unlock()

if not ok then
  error(buildError)
end

print("Spire Fusion graph created.")
print("If Sharp Grotesk is not installed, switch the font on the Spire_Letter_* TextPlus nodes.")
