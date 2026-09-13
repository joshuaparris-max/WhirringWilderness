# Podcast Integration TODO

**Decision:** Add if audio does not interfere with the game experience.  
**Status:** ✅ Core one-click podcast bank added 13 September 2026.
**Topic bank:** wilderness/nature themes, fantasy storytelling, worldbuilding, indie game design, exploration games.

## TODO
- [x] Use the shared 25-episode fantasy/RPG bank as the initial wilderness/game-design catalogue.
- [x] Add a collapsed bottom dock: **🌲 Listen to a different wilderness/game-design podcast**.
- [x] One tap selects/loads another episode; persist recent selections and avoid immediate repeats.
- [x] Use Spotify embed/deep links without assuming autoplay.
- [x] Collapse automatically whenever standard HTML game music/audio/video begins.
- [x] Shared tags cover worldbuilding, storytelling, exploration-adjacent themes and game design; a dedicated nature sub-bank can be added later.
- [x] Keep gameplay controls primary through the collapsed dock design.
- [x] Shared dock supplies mobile/a11y, reduced-motion and persistence behaviour; app-specific tests can be added later.

## Implementation
The Vite shell loads JoshHub's shared `dnd` catalogue through `podcast-dock-universal.js`.
