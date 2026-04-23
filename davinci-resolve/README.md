# DaVinci Resolve Motion Builds

This folder contains Fusion build scripts that recreate the branded title motion inside DaVinci Resolve.

## Files

- `roomingkos_fusion_build.lua`: Builds the Fusion node graph inside a fresh Fusion Composition.
- `spire_fusion_build.lua`: Builds a clean Spire-green version with start lights, a road, and letter-by-letter `SPIRE` reveal.

## Quick Start

1. In the Edit page, add a `Fusion Composition` to the timeline and stretch it to about `6 seconds`.
2. Open that clip in the `Fusion` page.
3. Make sure the comp is fresh and only has `MediaOut`.
4. Open the Console and run one of these scripts:

```lua
comp:RunScript("/Users/nmduk/PROJECTS/RK_Events_demo_version/davinci-resolve/roomingkos_fusion_build.lua")
```

```lua
comp:RunScript("C:/Users/natha/uknmd/RK-MK/davinci-resolve/spire_fusion_build.lua")
```

5. Go back to the node graph. You should see the branded layout and title animation already connected to `MediaOut`.
6. If the brand font is not installed, switch the font on the generated TextPlus nodes.

## What The Script Builds

### RoomingKos

- Cream panel on a RoomingKos beige background
- Pink accent strip and red underline
- Three accent dots
- `RoomingKos` text with red front fill and slate offset shadow
- Pop-in / settle motion timed for a 30 fps comp

### Spire

- Cream-and-green Spire panel
- Start lights and track
- Separate `S`, `P`, `I`, `R`, `E` TextPlus nodes timed to match the website's letter-slice reveal
- Motion timed for a 30 fps comp

## Fast Tweaks

- Change the title text near the `addText(... "RoomingKos" ...)` calls in `roomingkos_fusion_build.lua`.
- For Spire, adjust the `letters` table in `spire_fusion_build.lua` to change letter positions or timing.
- Change palette values in the `palette` table.
- Change timing by editing the `animateNumber(...)` and `animatePoint(...)` blocks.
- If your timeline is not `30 fps`, change `FPS = 30`.

## Make It Reusable In Titles

After the graph looks right, you can save it as a title template for the Edit page.

On macOS, DaVinci Resolve title templates are saved under:

```text
~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Templates/Edit/Titles/
```

After saving there, restart Resolve and the title will appear in the Edit page `Titles` category.

## Official References

- Fusion templates in Resolve: https://documents.blackmagicdesign.com/UserManuals/Fusion18_Manual.pdf
- Fusion page title workflow: https://documents.blackmagicdesign.com/UserManuals/DaVinci-Resolve-20-Fusion-Visual-Effects.pdf
- Fusion scripting API reference: https://documents.blackmagicdesign.com/UserManuals/Fusion8_Scripting_Guide.pdf
