# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A committed couple — **Max ("Me")** and their partner **Ants ("baby")** — planning travel *together*. They use it collaboratively and in real time, mostly on phones: both edit the same shared board and see each other's changes live. Primary scene is two people, two devices, riffing on a trip. Two named identities are core, not incidental.

## Product Purpose

A shared, realtime, delightful trip planner for the two of them. It turns loose ideas (links, screenshots, place names) into a real, mapped, day-by-day itinerary they build together. The current trip is a confirmed **Seoul trip (27 Nov – 4 Dec 2026, base camp Jongno-gu)**, but it is built to be **reusable for their future trips** (trip-scoped data model), not single-use.

Success is all three at once: (1) it survives **daily on-the-ground use during the trip** (phone-first, glanceable, spotty data), (2) it makes the **planning itself low-stress and complete**, and (3) it's genuinely **fun to open together**.

## Positioning

Not a generic planner and not a couples-cutesy toy — it **fuses real planning utility with a private couple's playfulness**, and refuses to trade one for the other. The utility (geocoded itinerary + map, auto-planner with day-trip clustering, "optimise route", real transit deep-links + AI directions, AI link/screenshot extraction, an AI concierge that adds places in one tap, Korean→English legibility) sits inside a world that is unmistakably *theirs* (joint chicken sim, pixel easter eggs, per-person voices, an unhinged shared sense of humor). A neighboring app could copy the features; it could not copy the two-of-them-ness.

## Operating Context

- **Two phones, one live board** — realtime shared state (presence, instant sync) is the default mode of use.
- **Two phases:** planning (desktop or phone, at home) and in-trip (phone-first, in Seoul, roaming/spotty data — offline tolerance is a goal, PWA not yet built).
- **Korean place data** flows in from Kakao (names/addresses/categories) and must be made legible to non-Korean speakers.
- Base camp **Jongno-gu** anchors routing and day planning.

## Capabilities and Constraints

- Realtime Supabase board: ideas (row-per-idea), itinerary, gallery/photos, chat, joint chicken. Trip-scoped for reuse across trips.
- AI: link/screenshot → pinned idea (extract), concierge chat that knows the plan and adds places, per-leg transit directions. All AI features **depend on the Anthropic API key** and degrade if it's unavailable.
- Maps/logistics: Leaflet map, geocoding, auto-planner, optimise-route, Google/Kakao transit deep-links.
- Themes: light, dark, and a Frutiger Aero pixel skin.
- **Constraints:** private 2-person app with **open RLS / no auth** (acceptable now, must change before any shared/friends build); phone-first with a **≥4.5:1 contrast** and readable-size floor the user explicitly requires; single large `src/App.jsx` (known tech debt).

## Brand Commitments

Binding, confirmed by the user as things future work must never lose:

- **Name:** *Me & Ants ♥ Travel Plans*. The two identities: **Max = "Me"**, partner = **"Ants" / "baby"**.
- **Cozy kawaii soul** — soft, cute, warm; the personality is load-bearing.
- **Playful hidden layer** — the joint chicken life-sim, pixel butterflies/blossoms/rainbow, long-press easter eggs.
- **"Me & Ants" two-person framing** — per-person voices and couple-ness in the copy.
- **Realtime togetherness** — the "we both see it update live" feeling (presence, shared board).
- **Voice:** playful, affectionate, unhinged, Singlish-inflected (their real caption style — see the house-voice analysis in agent memory).

## Evidence on Hand

- Real trip data in Supabase: ~63 ideas + itinerary for the Seoul trip.
- Real couple-authored captions/comments (the genuine voice corpus).
- No fabricated testimonials, customers, pricing, or metrics — it is a private app; future work must not invent any.

## Product Principles

1. **Delightful AND genuinely useful** — never sacrifice one for the other; that tension is the product.
2. **The playful soul is load-bearing** — kawaii, the chicken, the easter eggs and couple voice are features to protect, not decoration to trim.
3. **Two people, live** — design for a shared realtime space for a couple, not a solo tool.
4. **Phone-first, on-the-ground** — it must earn daily use during the trip: glanceable, thumb-friendly, tolerant of bad data.
5. **Reusable across trips** — keep it trip-scoped so the next trip inherits everything.

## Accessibility & Inclusion

User explicitly requires **readable contrast (≥4.5:1)** and **no squinting** (comfortable font sizes) — a recent pass raised the muted-text and font-size floors. Phone-first touch targets. Keep these floors in all future UI.
