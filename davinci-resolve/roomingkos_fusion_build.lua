-- RoomingKos branded title builder for DaVinci Resolve / Fusion.
-- Run this on a fresh Fusion Composition that only contains MediaOut.

local fusionApp = fusion or fu or Fusion()
local activeComp = composition or comp or (fusionApp and fusionApp:GetCurrentComp())

if not activeComp then
  error("Open a Fusion Composition in the Fusion page first.")
end

local comp = activeComp

local FPS = 30

local palette = {
  bg = {247 / 255, 241 / 255, 235 / 255},
  cream = {255 / 255, 251 / 255, 247 / 255},
  sand = {241 / 255, 231 / 255, 220 / 255},
  red = {218 / 255, 31 / 255, 67 / 255},
  slate = {85 / 255, 97 / 255, 115 / 255},
  redSoft = {246 / 255, 216 / 255, 221 / 255}
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

local function addText(name, textValue, color, x, y)
  local text = comp:AddTool("TextPlus", x, y)
  rename(text, name)
  setInput(text, "StyledText", textValue)
  setInput(text, "Font", "Bricolage Grotesque")
  setInput(text, "Style", "ExtraBold")
  setInput(text, "Size", 0.135)
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

if nonMediaOutCount() > 0 then
  error("Use this script on a fresh Fusion Composition. The current comp already has tools besides MediaOut.")
end

local mediaOut = firstByRegID("MediaOut")
if not mediaOut then
  mediaOut = comp:AddTool("MediaOut", 24, 0)
end

comp:Lock()

local ok, buildError = pcall(function()
  local bg = addBackground("RK_BG", palette.bg, -18, 0)

  local panelShadow = addBackground("RK_PanelShadow", palette.slate, -14, 3)
  local panelShadowMask = addRectangleMask("RK_PanelShadowMask", 0.82, 0.44, 0.513, 0.515, 0.08, -18, 3)
  connect(panelShadow, "EffectMask", panelShadowMask)
  local panelShadowTx = addTransform("RK_PanelShadowTx", panelShadow, -10, 3)

  local merge1 = addMerge("RK_MergePanelShadow", bg, panelShadowTx, -6, 2)

  local panel = addBackground("RK_Panel", palette.cream, -14, 0)
  local panelMask = addRectangleMask("RK_PanelMask", 0.82, 0.44, 0.5, 0.5, 0.08, -18, 0)
  connect(panel, "EffectMask", panelMask)
  local panelTx = addTransform("RK_PanelTx", panel, -10, 0)

  local merge2 = addMerge("RK_MergePanel", merge1, panelTx, -6, 0)

  local blush = addBackground("RK_Blush", palette.redSoft, -14, -3)
  local blushMask = addRectangleMask("RK_BlushMask", 0.68, 0.07, 0.5, 0.345, 0.05, -18, -3)
  connect(blush, "EffectMask", blushMask)
  local blushTx = addTransform("RK_BlushTx", blush, -10, -3)
  local merge3 = addMerge("RK_MergeBlush", merge2, blushTx, -6, -2)

  local underline = addBackground("RK_Underline", palette.red, -14, -6)
  local underlineMask = addRectangleMask("RK_UnderlineMask", 0.28, 0.012, 0.5, 0.618, 0.04, -18, -6)
  connect(underline, "EffectMask", underlineMask)
  local underlineTx = addTransform("RK_UnderlineTx", underline, -10, -6)
  local merge4 = addMerge("RK_MergeUnderline", merge3, underlineTx, -6, -5)

  local dotRed = addBackground("RK_DotRed", palette.red, -14, -9)
  local dotRedMask = addEllipseMask("RK_DotRedMask", 0.024, 0.024, 0.232, 0.345, -18, -9)
  connect(dotRed, "EffectMask", dotRedMask)
  local dotRedTx = addTransform("RK_DotRedTx", dotRed, -10, -9)
  local merge5 = addMerge("RK_MergeDotRed", merge4, dotRedTx, -6, -8)

  local dotSlate = addBackground("RK_DotSlate", palette.slate, -14, -12)
  local dotSlateMask = addEllipseMask("RK_DotSlateMask", 0.017, 0.017, 0.76, 0.665, -18, -12)
  connect(dotSlate, "EffectMask", dotSlateMask)
  local dotSlateTx = addTransform("RK_DotSlateTx", dotSlate, -10, -12)
  local merge6 = addMerge("RK_MergeDotSlate", merge5, dotSlateTx, -6, -11)

  local dotSand = addBackground("RK_DotSand", palette.sand, -14, -15)
  local dotSandMask = addEllipseMask("RK_DotSandMask", 0.02, 0.02, 0.795, 0.32, -18, -15)
  connect(dotSand, "EffectMask", dotSandMask)
  local dotSandTx = addTransform("RK_DotSandTx", dotSand, -10, -15)
  local merge7 = addMerge("RK_MergeDotSand", merge6, dotSandTx, -6, -14)

  local textShadow = addText("RK_TextShadow", "RoomingKos", palette.slate, -14, -18)
  local textShadowTx = addTransform("RK_TextShadowTx", textShadow, -10, -18)
  local merge8 = addMerge("RK_MergeTextShadow", merge7, textShadowTx, -6, -17)

  local textFront = addText("RK_TextFront", "RoomingKos", palette.red, -14, -21)
  local textFrontTx = addTransform("RK_TextFrontTx", textFront, -10, -21)
  local merge9 = addMerge("RK_MergeTextFront", merge8, textFrontTx, -6, -20)

  connectMainInput(mediaOut, merge9)

  animateNumber(panelShadowTx, "Size", {
    [frames(0.08)] = 0.88,
    [frames(0.46)] = 1.03,
    [frames(0.72)] = 1.00
  })
  animateNumber(merge1, "Blend", {
    [frames(0.08)] = 0.00,
    [frames(0.26)] = 0.14
  })

  animateNumber(panelTx, "Size", {
    [frames(0.00)] = 0.88,
    [frames(0.38)] = 1.03,
    [frames(0.64)] = 1.00
  })
  animateNumber(merge2, "Blend", {
    [frames(0.00)] = 0.00,
    [frames(0.18)] = 1.00
  })

  animateNumber(blushTx, "Size", {
    [frames(0.14)] = 0.88,
    [frames(0.52)] = 1.03,
    [frames(0.78)] = 1.00
  })
  animateNumber(merge3, "Blend", {
    [frames(0.14)] = 0.00,
    [frames(0.32)] = 0.55
  })

  animateNumber(underlineTx, "Size", {
    [frames(0.80)] = 0.01,
    [frames(1.18)] = 1.12,
    [frames(1.42)] = 1.00
  })
  animateNumber(merge4, "Blend", {
    [frames(0.80)] = 0.00,
    [frames(0.92)] = 1.00
  })

  animateNumber(dotRedTx, "Size", {
    [frames(0.54)] = 0.00,
    [frames(0.76)] = 1.35,
    [frames(0.96)] = 1.00
  })
  animateNumber(merge5, "Blend", {
    [frames(0.54)] = 0.00,
    [frames(0.66)] = 1.00
  })

  animateNumber(dotSlateTx, "Size", {
    [frames(0.66)] = 0.00,
    [frames(0.88)] = 1.35,
    [frames(1.08)] = 1.00
  })
  animateNumber(merge6, "Blend", {
    [frames(0.66)] = 0.00,
    [frames(0.78)] = 1.00
  })

  animateNumber(dotSandTx, "Size", {
    [frames(0.74)] = 0.00,
    [frames(0.96)] = 1.35,
    [frames(1.16)] = 1.00
  })
  animateNumber(merge7, "Blend", {
    [frames(0.74)] = 0.00,
    [frames(0.86)] = 1.00
  })

  animateNumber(textShadowTx, "Size", {
    [frames(0.32)] = 0.54,
    [frames(0.61)] = 1.12,
    [frames(0.88)] = 1.00
  })
  animatePoint(textShadowTx, "Center", {
    [frames(0.32)] = point(0.511, 0.612),
    [frames(0.61)] = point(0.511, 0.492),
    [frames(0.88)] = point(0.511, 0.512)
  })
  animateNumber(textShadowTx, "Angle", {
    [frames(0.32)] = -8,
    [frames(0.88)] = 0
  })
  animateNumber(merge8, "Blend", {
    [frames(0.32)] = 0.00,
    [frames(0.48)] = 0.24
  })
  animateNumber(textShadow, "WriteOnEnd", {
    [frames(0.32)] = 0.05,
    [frames(0.88)] = 1.00
  })

  animateNumber(textFrontTx, "Size", {
    [frames(0.32)] = 0.62,
    [frames(0.61)] = 1.18,
    [frames(0.88)] = 1.00,
    [frames(1.32)] = 1.00,
    [frames(1.74)] = 1.04,
    [frames(2.08)] = 1.00
  })
  animatePoint(textFrontTx, "Center", {
    [frames(0.32)] = point(0.500, 0.602),
    [frames(0.61)] = point(0.500, 0.485),
    [frames(0.88)] = point(0.500, 0.500),
    [frames(1.32)] = point(0.500, 0.500),
    [frames(2.08)] = point(0.500, 0.491),
    [frames(2.50)] = point(0.500, 0.500)
  })
  animateNumber(textFrontTx, "Angle", {
    [frames(0.32)] = -8,
    [frames(0.88)] = 0
  })
  animateNumber(merge9, "Blend", {
    [frames(0.32)] = 0.00,
    [frames(0.44)] = 1.00
  })
  animateNumber(textFront, "WriteOnEnd", {
    [frames(0.32)] = 0.05,
    [frames(0.88)] = 1.00
  })
end)

comp:Unlock()

if not ok then
  error(buildError)
end

print("RoomingKos Fusion graph created.")
print("If Bricolage Grotesque is not installed, switch the font on RK_TextFront and RK_TextShadow.")
