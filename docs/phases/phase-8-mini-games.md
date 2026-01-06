# Phase 8: Mini-Games Expansion & Refresh

**Status:** ✅ Complete
**Prerequisites:** [Phase 6: Meta Game](phase-6-meta.md) (and ideally [Phase 7: Title Screen](phase-7-title-screen.md) so the “Games” entry point is polished)
**Goal:** Expand the mini-game rotation with short, snackable mini-games that feel like the “ad-style” side games seen in Royal Match–type puzzle games, while staying quick to build and mobile-friendly.

---

## Overview

Mini-games are a great way to:
- Give players a reason to check the game daily
- Create a “treat” sink for diamonds that still feels generous
- Add variety without touching core match gameplay

**Design philosophy:** 30–90 seconds to understand, 1–3 minutes to finish, satisfying win/lose feedback, and always a meaningful reward.

---

## What “Royal Match–style” Mini-Games Mean (for us)

These mini-games are typically:
- **One-screen**: minimal UI, clear goal
- **Few controls**: tap, drag, or swipe
- **Readable instantly**: you know what to do in < 3 seconds
- **High drama**: “save the character”, “fix the hazard”, “get the treasure”
- **Short sessions**: can be played in a queue

We’ll implement our own original variants (not copies) of these patterns.

---

## Deliverables Checklist

### System / UX
- [x] Expand rotation pool from 3 to 6–9 mini-games (now have 11 total!)
- [x] Update mini-game hub cards to support "New!" and "Recommended" tags
- [x] Add a lightweight tutorial overlay (first-time only per mini-game)
- [x] Add consistent result screen: reward summary + "Play again" + "Back to hub"
- [x] Improve reward pacing so diamond spend always feels worth it

### Tech
- [x] Create a tiny shared mini-game contract (start, end, reward, telemetry hooks)
- [x] Add a shared "MiniGameRewardPresenter" UI component for consistency
- [x] Add a shared input helper (tap/drag) with mobile-first defaults
- [x] Add an easy way to drop new scenes into rotation via `CONFIG.META.MINI_GAMES`

### Content
- [x] Ship at least **3 new mini-games** (shipped 8 new games!)
- [x] Add placeholder art + SFX hooks so they feel alive

---

## Proposed Mini-Game Concepts (examples)

Below are “good fits” because they’re fast to build in Phaser, simple to learn, and match the vibe players expect.

### 1) Pin Pull Rescue (logic)
**Core loop:** Tap pins in the right order so hazards don’t hit the character and the reward reaches safety.
- **Controls:** tap pins
- **Fail:** character touches hazard (fire/water/monsters)
- **Win:** character reaches safe zone / treasure collected
- **Difficulty ramp:** more pins, moving hazards, timed gates

Implementation notes:
- Represent pins as blocking segments
- Use simple gravity + collision
- Deterministic simulation per level seed

### 2) Pipe Connect (routing)
**Core loop:** Rotate/connect pipe tiles to route water from source to destination.
- **Controls:** tap to rotate
- **Win:** water reaches endpoint before timer
- **Fail:** timer expires / wrong routing leaks
- **Difficulty ramp:** more pipe pieces, split paths, limited rotations

Implementation notes:
- Grid-based; each pipe tile has 2–4 connection directions
- Validate connectivity via BFS/graph traversal

### 3) “Save the Room” Hazard Choice (one-tap decision)
**Core loop:** Choose the correct action out of 2–3 options to resolve a situation.
Examples: “Block smoke”, “Fix heater”, “Open vent”.
- **Controls:** tap a choice
- **Win:** correct choice chain (3–5 steps)
- **Fail:** wrong choice triggers a funny-but-clear fail animation
- **Difficulty ramp:** longer chains, less obvious clues

Implementation notes:
- This is extremely cheap to build and great for variety.

### 4) Stack Sort (tube sorting)
**Core loop:** Move colored balls/items between vertical tubes—only the top item can move, and only onto the same color or an empty tube. Sort all colors to win.
- **Controls:** tap source tube, tap destination tube
- **Win:** each tube contains only one color
- **Fail:** no valid moves remaining (or move limit)
- **Difficulty ramp:** more colors, more tubes, fewer empty slots, locked tubes

Implementation notes:
- Proven viral format (Ball Sort Puzzle)
- Satisfying "pour" animation when items transfer
- Easy to generate procedural levels with guaranteed solutions

### 5) Parking Jam (sliding puzzle)
**Core loop:** Slide vehicles to free the target vehicle.
- **Controls:** drag to slide along axis
- **Win:** target exits
- **Fail:** none (or time-based bonus)
- **Difficulty ramp:** board size, vehicle density

Implementation notes:
- Clean logic, deterministic, loads of small levels.

### 6) Slingshot Knockout (physics destruction)
**Core loop:** Pull back a slingshot to launch projectiles at stacked structures. Knock down all targets within limited shots.
- **Controls:** drag to aim + set power, release to shoot
- **Win:** clear all targets / reach score threshold
- **Fail:** run out of shots
- **Difficulty ramp:** tougher materials, moving targets, trick shots required

Implementation notes:
- Angry Birds-style physics; very satisfying destruction
- Add variety with different projectile types (heavy, bouncy, explosive)
- Particle effects on impact sell the destruction

### 7) Bridge Builder (timing)
**Core loop:** Tap-and-hold to extend a bridge to the next platform; release at the right length.
- **Controls:** press/hold/release
- **Win:** cross N platforms
- **Fail:** bridge too short/long
- **Difficulty ramp:** smaller platforms, moving platforms

Implementation notes:
- Minimal assets; very “one more try”.

### 8) Treasure Dig (grid search)
**Core loop:** Tap squares on a grid to dig. Numbers reveal how many squares away the treasure is. Find the treasure before running out of digs.
- **Controls:** tap to dig
- **Win:** find the treasure
- **Fail:** run out of digs
- **Difficulty ramp:** larger grids, multiple treasures required, hazard squares (bombs = lose a dig), decoy chests

Implementation notes:
- Minesweeper-lite meets treasure hunting
- High tension with each dig—"is it here?!"
- Simple to build, easy to add themed variants (desert dig, underwater salvage, etc.)
- Distance numbers can show arrows or just proximity for accessibility

---

## Rotation & Rewards Recommendations

### Rotation
- Keep 2 games available at a time, but expand the pool to **6–9**.
- Add a “Featured” slot occasionally (e.g., weekend bonus).

### Reward Design
- Diamond cost should map to expected reward value (always positive feeling).
- Add **streak bonuses** (play 3 mini-games in a week → extra prize).
- Allow some mini-games to award **mini-game tickets** so players can play without diamonds sometimes.

Example reward bands:
- **10 diamonds:** small but guaranteed (coins + small booster)
- **15–20 diamonds:** medium reward + chance at rare drop
- **25 diamonds:** “premium” mini-game with larger payout

---

## Implementation Order (practical)

1. Add a shared mini-game result/reward presentation component
2. Add 1 new mini-game with the full loop (tutorial → play → result)
3. Add 2 more mini-games reusing the same UI scaffolding
4. Expand `CONFIG.META.MINI_GAMES` and update hub mapping
5. Add rotation polish: tags, new indicators, and (optional) featured slot

---

## Success Criteria

Phase 8 is complete when:
- ✅ At least **3 new mini-games** are playable end-to-end (shipped 8!)
- ✅ Rotation pool contains **6+** total mini-games (now 11 total)
- ✅ Mini-game UI feels consistent (tutorial, play, result)
- ✅ Rewards feel fair and fun (no "I spent diamonds for nothing" feeling)
- ✅ Mini-games run smoothly on mobile (touch + performance)
