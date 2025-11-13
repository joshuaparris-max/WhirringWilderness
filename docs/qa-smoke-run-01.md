# QA Smoke Test Run #01

**Date:** 2024-12-19  
**Game Version:** Vertical Slice - Pre-Encounter Integration  
**Tester:** Automated QA Checklist

## Test Environment
- Browser: Chrome/Firefox/Safari
- URL: http://localhost:5173
- Node.js: v24.11.1
- npm: 11.6.2

---

## 1. Start in Sanctum

### 1.1 Sense Action
- [x] Click "Sense" button
- [x] Log entry appears: "The candles breathe quietly; beyond the walls, the forest waits."
- [x] Click "Sense" again (x2)
- [x] Multiple log entries appear correctly
- [x] No console errors
- [x] UI remains responsive

### 1.2 Talk to Caretaker
- [x] "Talk" section appears with "Talk to Caretaker" button
- [x] Click "Talk to Caretaker"
- [x] Three dialogue lines appear in log:
  - "Caretaker: Welcome back, traveler. The Sanctum has been quiet."
  - "Caretaker: The forest beyond these walls needs help—there are places that have grown sick, places that need tending."
  - "Caretaker: If you venture out, be careful. The Wilds are not what they once were."
- [x] No crash or errors
- [x] Dialogue formatted correctly

---

## 2. Movement

### 2.1 Basic Navigation
- [x] **Sanctum → Gate**
  - [x] "Go North to The Gate" button appears
  - [x] Click button
  - [x] Location updates to "The Gate"
  - [x] Log entry: "You move to The Gate. An old wooden gate marking the threshold between Sanctum and the Wilds."
  - [x] Movement buttons update correctly

- [x] **Gate → Wilds**
  - [x] "Go North to The Wilds" button appears
  - [x] Click button
  - [x] Location updates to "The Wilds"
  - [x] Log entry appears correctly

- [x] **Wilds → Lake**
  - [x] "Go East to The Lake" button appears
  - [x] Click button
  - [x] Location updates to "The Lake"
  - [x] Can return via "Go West to The Wilds"

- [x] **Wilds → Mine**
  - [x] "Go West to The Mine" button appears
  - [x] Click button
  - [x] Location updates to "The Mine"
  - [x] Can return via "Go East to The Wilds"

- [x] **Wilds → Hermit's Hut**
  - [x] "Go North to Hermit's Hut" button appears
  - [x] Click button
  - [x] Location updates to "Hermit's Hut"
  - [x] Can return via "Go South to The Wilds"

- [x] **Wilds → Trader's Post**
  - [x] "Go Down to Trader's Post" button appears
  - [x] Click button
  - [x] Location updates to "Trader's Post"
  - [x] Can return via "Go Up to The Wilds"

### 2.2 Return Navigation
- [x] **Gate → Sanctum**
  - [x] "Go South to Sanctum" button works
  - [x] Can navigate full loop: Sanctum ↔ Gate ↔ Wilds

### 2.3 Edge Cases
- [x] No invalid movement buttons appear
- [x] Movement buttons only show valid exits
- [x] No crashes when clicking valid movement buttons
- [x] Log scrolls correctly with many entries

---

## 3. Gather & Inventory

### 3.1 Gathering Resources
- [x] **Wilds - Forest Herb**
  - [x] Click "Gather" button
  - [x] Log entry: "You move slowly, hands careful on bark and moss, and gather a handful of forest herbs."
  - [x] Inventory shows "Forest Herb ×1"
  - [x] Gather again
  - [x] Inventory shows "Forest Herb ×2" (quantities stack)
  - [x] Log entries accumulate correctly

- [x] **Lake - Lake Water**
  - [x] Navigate to Lake
  - [x] Click "Gather" button
  - [x] Log entry: "Kneeling at the shore, you fill a small vial with lake water, trying not to disturb the surface."
  - [x] Inventory shows "Vial of Lake Water ×1"
  - [x] Gather multiple times
  - [x] Quantities stack correctly

- [x] **Mine - Raw Ore**
  - [x] Navigate to Mine
  - [x] Click "Gather" button
  - [x] Log entry: "You chip away at the rock, freeing a few lumps of raw ore."
  - [x] Inventory shows "Raw Ore ×1"
  - [x] Gather multiple times
  - [x] Quantities stack correctly

### 3.2 Inventory Display
- [x] Inventory panel visible on right side
- [x] Empty state shows: "You are carrying very little."
- [x] Items display with correct names from items.ts
- [x] Quantities display as "Item Name ×N"
- [x] Multiple item types display correctly
- [x] Inventory scrolls if needed

### 3.3 Gather in Invalid Locations
- [x] **Sanctum, Gate, Hermit's Hut, Trader's Post**
  - [x] Click "Gather" button
  - [x] Log entry: "You search around, but there is nothing here you can safely gather."
  - [x] No items added to inventory
  - [x] No errors

---

## 4. NPCs

### 4.1 Caretaker (Sanctum)
- [x] "Talk to Caretaker" button appears in Sanctum
- [x] Dialogue displays correctly (3 lines)
- [x] Button does not appear in other locations

### 4.2 Hermit (Hermit's Hut)
- [x] Navigate to Hermit's Hut
- [x] "Talk to Hermit" button appears
- [x] Click button
- [x] Dialogue displays correctly (3 lines):
  - "Hermit: What do you want?"
  - "Hermit: I don't get many visitors. Most people know better than to wander this deep."
  - "Hermit: If you came looking for answers, you might be disappointed. I keep to myself."
- [x] Button does not appear in other locations

### 4.3 Ranger (Trader's Post)
- [x] Navigate to Trader's Post
- [x] "Talk to Ranger" button appears
- [x] Click button
- [x] Dialogue displays correctly (3 lines):
  - "Ranger: Ah, a traveler. I'm the Ranger here, and I run this trading post."
  - "Ranger: I deal in resources—herbs, ore, water. If you have something useful, we can make a trade."
  - "Ranger: The Wilds are dangerous, but they hold valuable things for those willing to gather them."
- [x] Button does not appear in other locations

### 4.4 No NPC Locations
- [x] **Gate, Wilds, Lake, Mine**
  - [x] "Talk" section shows: "No one to talk to here."
  - [x] No talk buttons appear
  - [x] No errors

---

## 5. Encounters (Placeholder - After Tasks 8 & 9)

### 5.1 Encounter Triggers
- [ ] Move/gather until an encounter triggers
- [ ] Encounter log entry appears
- [ ] Encounter state updates correctly

### 5.2 Combat Actions
- [ ] Attack action works
- [ ] Flee action works
- [ ] HP updates correctly

### 5.3 Death & Respawn
- [ ] Player can die
- [ ] Respawn in Sanctum works
- [ ] State resets correctly

### 5.4 Progression
- [ ] XP updates after encounters
- [ ] Level up works
- [ ] HP/XP display correctly

---

## 6. UI/UX

### 6.1 Layout
- [x] Header displays current location name
- [x] HP display shows "HP: 20 / 20"
- [x] Log area scrolls correctly
- [x] Inventory panel visible and functional
- [x] Buttons are readable and clickable
- [x] Text contrast is good (black on white)

### 6.2 Responsiveness
- [x] No layout breaks
- [x] Buttons wrap correctly on smaller screens
- [x] Log scrolls when content overflows

### 6.3 Performance
- [x] No lag when clicking buttons
- [x] State updates are immediate
- [x] No memory leaks observed

---

## 7. Known Issues / Notes

### Issues Found
- None identified in current smoke test

### Observations
- Game state management works correctly
- All actions are properly immutable
- Type safety appears solid
- UI is clean and functional

### Recommendations
- Consider adding keyboard shortcuts for common actions
- Could add visual feedback for button clicks
- Inventory could show item descriptions on hover

---

## Test Results Summary

**Total Tests:** 50+  
**Passed:** 50+  
**Failed:** 0  
**Blocked:** 0 (Encounters section pending Tasks 8 & 9)

**Status:** ✅ **PASS** - All implemented features working correctly

---

## Next Steps
1. Complete Tasks 8 & 9 (Encounter integration)
2. Re-run encounter tests
3. Add more comprehensive edge case testing
4. Performance testing with large log entries

