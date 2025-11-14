// Quick playtest script to simulate will-o-wisp defeat and Hermit fragment delivery
import { createInitialState, appendLog } from '../src/engine/gameState';
import { moveTo, attack, talkTo, addItemToInventory } from '../src/engine/actions';
import { createEncounterState } from '../src/engine/encounters';
import { creatures } from '../src/content/creatures';

function printLogs(state: any) {
  console.log('--- Logs ---');
  for (const l of state.log) console.log(l.type, '-', l.text);
  console.log('------------');
}

async function run() {
  let state = createInitialState();
  console.log('Initial location:', state.currentLocation);

  // Move to wilds first so hermit/quests can unlock flow
  let res = moveTo(state, 'wilds');
  state = res.state;
  state = res.state;
  state = appendLog(state, ...res.logEntries);
  console.log('Moved to wilds. Location:', state.currentLocation);

  // For test simplicity, directly create an encounter with will_o_wisp
  const will = creatures['will_o_wisp'];
  if (!will) {
    console.error('will_o_wisp missing in content/creatures');
    return;
  }

  const encounterState = createEncounterState(state, will);
  state = encounterState;
  console.log('Forced encounter with:', will.name);

  // Attack until creature dies
  let round = 0;
  while (state.currentEncounter) {
    round += 1;
    const outcome = attack(state);
    state = outcome.state;
    for (const e of outcome.logEntries) state = appendLog(state, e);
    console.log('Round', round, 'logs:', outcome.logEntries.map(l=>l.text).join(' | '));
    if (round > 10) break; // safety
  }

  // Check inventory
  const fragments = state.player.inventory.find((i:any)=>i.itemId==='luminous_fragment')?.quantity ?? 0;
  console.log('Luminous fragments after combat:', fragments);

  // Move to hermit_hut and talk to hermit (ensure echoes quest completed so hermit offers)
  res = moveTo(state, 'hermit_hut');
  state = res.state;
  for (const e of res.logEntries) state = appendLog(state, e);
  console.log('Moved to hermit hut. Location:', state.currentLocation);

  const talk = talkTo(state, 'hermit');
  state = talk.state;
  for (const e of talk.logEntries) state = appendLog(state, e);

  console.log('Hermit talk logs:');
  for (const l of talk.logEntries) console.log(l.type, '-', l.text);

  // Final inventory & quest
  const finalFragments = state.player.inventory.find((i:any)=>i.itemId==='luminous_fragment')?.quantity ?? 0;
  console.log('Final luminous fragments:', finalFragments);
}

run().catch((e)=>{ console.error('Error during playtest:', e); process.exit(1); });
