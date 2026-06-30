# Max ♥ Partner — Year-End Trip Planning Hub 🧳✨

A romantic, soft-kawaii single-page React app for evaluating a year-end couple's
trip (**Nov 27 – Dec 4**) across five cozy-winter destinations.

> **Top pick: 🧸 Seoul** — biting cold with possible flurries, on-budget on
> full-service Korean Air, elite raw seafood + character flagships, latest usable
> daylight. **❄️ Sapporo** is the snow-globe splurge if budget can stretch.

## Features

- 🗳️ **Two-person Heart Tracker** — separate Max & Partner votes per destination
- 💾 **Auto-save** — votes persist in `localStorage` and survive refresh
- 💞 **Consensus detector** — lights up when you both rank the same place #1
- 📜 **Deep-dive drawers** — Level 4 daytime power-run vs Level 2 cozy-night haul
- 🌡️ **Live weather peek** — current conditions per city via [Open-Meteo](https://open-meteo.com) (no API key)
- 📊 **Comparison snapshot** table across flight / weather / sunset / stay

## Destinations

Sapporo · Seoul · Tokyo · Taipei · Fukuoka — each a chunky "Travel Passport"
card with tailored flight, weather, sunset, basecamp-station, food and cute-IP data.

## Tech

React 18 · Vite 6 · Tailwind CSS 3 · lucide-react

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

## Notes

The live weather widget shows **current** conditions, not a forecast for the trip
dates (no free API forecasts months ahead). Trip-date figures are curated planning
ranges for late November / early December.
