# RoomingKos DaVinci Resolve Version

This folder contains a Fusion build script that recreates the branded `RoomingKos` title motion in DaVinci Resolve.

## Files

- `roomingkos_fusion_build.lua`: Builds the Fusion node graph inside a fresh Fusion Composition.

## Quick Start

1. In the Edit page, add a `Fusion Composition` to the timeline and stretch it to about `6 seconds`.
2. Open that clip in the `Fusion` page.
3. Make sure the comp is fresh and only has `MediaOut`.
4. Open the Console and run:

```lua
comp:RunScript("/Users/nmduk/PROJECTS/RK_Events_demo_version/davinci-resolve/roomingkos_fusion_build.lua")
```

5. Go back to the node graph. You should see the branded layout and title animation already connected to `MediaOut`.
6. If `Bricolage Grotesque` is not installed on your Mac, switch the font on `RK_TextFront` and `RK_TextShadow`.

## What The Script Builds

- Cream panel on a RoomingKos beige background
- Pink accent strip and red underline
- Three accent dots
- `RoomingKos` text with red front fill and slate offset shadow
- Pop-in / settle motion timed for a 30 fps comp

## Fast Tweaks

- Change the title text near the `addText(... "RoomingKos" ...)` calls in `roomingkos_fusion_build.lua`.
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
