# FactorioTetris

FactorioTetris is a TypeScript single-page app for planning Factorio equipment grids. It targets GitHub Pages, supports drag-and-drop editing, exposes the current vanilla equipment-grid hosts, and includes an energy-aware first-pass auto optimizer.

## What is in the repo

- `src/data/factorioData.ts` encodes the current wiki-backed host and equipment data, including quality-specific values and image URLs.
- `src/lib/grid.ts` handles placement validation, rotation, and greedy first-fit packing.
- `src/lib/optimizer.ts` provides a configurable auto-fill routine for power, mobility, shield, laser, and battery focused layouts.
- `src/components/AccessPanel.tsx` lets you whitelist or blacklist each module at each quality tier before running optimization.
- `src/components/*` contains the host selector, palette, grid editor, optimizer controls, and summary UI.

## Current vanilla coverage

- Player hosts: `Modular armor`, `Power armor`, `Power armor MK2`, `Mech armor`
- Vehicle hosts with equipment grids: `Tank`, `Spidertron`

The app intentionally does not include `Car` because the current official Factorio wiki does not expose an equipment grid for it.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deployment

The repo includes `.github/workflows/deploy.yml` for GitHub Pages. The Vite `base` path is pinned to `/FactorioTetris/`.

## Source data

The encoded values come from the official Factorio wiki infobox pages and associated module overview pages, including:

- `https://wiki.factorio.com/Equipment_modules`
- `https://wiki.factorio.com/Infobox:Modular_armor`
- `https://wiki.factorio.com/Infobox:Power_armor`
- `https://wiki.factorio.com/Infobox:Power_armor_MK2`
- `https://wiki.factorio.com/Infobox:Mech_armor`
- `https://wiki.factorio.com/Infobox:Tank`
- `https://wiki.factorio.com/Infobox:Spidertron`
- `https://wiki.factorio.com/Infobox:Portable_solar_panel`
- `https://wiki.factorio.com/Infobox:Portable_fission_reactor`
- `https://wiki.factorio.com/Infobox:Personal_battery`
- `https://wiki.factorio.com/Infobox:Personal_battery_MK2`
- `https://wiki.factorio.com/Infobox:Personal_battery_MK3`
- `https://wiki.factorio.com/Infobox:Energy_shield`
- `https://wiki.factorio.com/Infobox:Energy_shield_MK2`
- `https://wiki.factorio.com/Infobox:Personal_laser_defense`
- `https://wiki.factorio.com/Infobox:Personal_roboport`
- `https://wiki.factorio.com/Infobox:Personal_roboport_MK2`
- `https://wiki.factorio.com/Infobox:Exoskeleton`
- `https://wiki.factorio.com/Infobox:Nightvision`
- `https://wiki.factorio.com/Infobox:Belt_immunity_equipment`
- `https://wiki.factorio.com/Infobox:Toolbelt_equipment`
- `https://wiki.factorio.com/Infobox:Discharge_defense`
