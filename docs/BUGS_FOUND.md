# Bugs Found During Testing

## Critical Bugs

### 1. Encounters Can Trigger After Run Has Ended
**Location:** `src/engine/actions.ts:46-66` (maybeTriggerEncounter)

**Issue:** The `maybeTriggerEncounter` function doesn't check if `runEnded` is true. This means encounters can still trigger after the player has died, which doesn't make narrative sense.

**Impact:** Players can get into encounters after death, breaking game state consistency.

**Fix:** Add check for `runEnded` flag before triggering encounters.

---

### 2. Movement Not Blocked at Engine Level When Run Ended
**Location:** `src/engine/actions.ts:137-177` (moveTo)

**Issue:** The `moveTo` function doesn't check if `runEnded` is true. While the UI disables the button, the engine function should also validate this for defensive programming.

**Impact:** If the function is called directly (e.g., through console or future API), players could move after death.

**Fix:** Add early return if `runEnded` is true.

---

### 3. Gather/Sense Not Blocked at Engine Level When Run Ended
**Location:** `src/engine/actions.ts:182-226` (sense), `src/engine/actions.ts:231-333` (gather)

**Issue:** These functions don't check if `runEnded` is true. While UI disables buttons, engine should validate.

**Impact:** Defensive programming issue - functions should validate their preconditions.

**Fix:** Add early return if `runEnded` is true.

---

## Medium Priority Issues

### 4. Quest Progress Calculation Could Be More Efficient
**Location:** `src/ui/GameScreen.tsx:408-416`

**Issue:** Quest progress is calculated in the render function, which means it recalculates on every render. This is fine for small data, but could be optimized.

**Status:** Minor performance issue, not a bug.

---

### 5. Missing Validation: Can Perform Ritual Without Being in Wilds
**Location:** `src/engine/actions.ts:931-955` (performGroveRitual)

**Status:** ✅ Already validated - function checks location.

---

### 6. Missing Validation: Can Trade Without Being at Trader Post
**Location:** `src/engine/actions.ts:1043-1098` (performTrade)

**Status:** ✅ Already validated - function checks location.

---

## Edge Cases Tested

### ✅ Working Correctly:
- Player death sets `runEnded` flag
- UI disables all action buttons when `runEnded` is true
- New run properly resets state
- Gather counters reset on new run
- Quest state transitions work correctly
- Combat damage calculations are correct
- Escape chance is 70% as documented
- Item removal works correctly
- XP and leveling work correctly

### ⚠️ Potential Issues:
- If player somehow calls engine functions directly (e.g., through console), they can bypass UI restrictions
- Encounters can trigger after death (bug #1)

---

## Recommendations

1. **Fix Bug #1 immediately** - This breaks game state consistency
2. **Fix Bugs #2-3** - Defensive programming, prevents future issues
3. **Consider adding engine-level validation** for all actions to check `runEnded`
4. **Add unit tests** to catch these issues in the future
