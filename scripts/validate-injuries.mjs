import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HOMER_INJURIES,resolveHomerInjury,resolveHomerInjuries} from '../app/injuries.ts';
import {filterCatalogue,matchInjuriesLocally} from '../app/injury-library.ts';
const atlas=JSON.parse(await readFile(new URL('../public/models/atlas.json',import.meta.url)));
const allowed=new Set(atlas.parts.map(p=>p.id));
for(const injury of HOMER_INJURIES){
 const ids=resolveHomerInjury(atlas,injury.id);
 assert.ok(ids.length>0,`${injury.id}: no reference anatomy resolved`);
 assert.equal(new Set(ids).size,ids.length,`${injury.id}: duplicate anatomy ids`);
 for(const id of ids)assert.ok(allowed.has(id),`${injury.id}: missing anatomy part ${id}`);
 console.log(`${injury.id}: ${ids.length} reference ${ids.length===1?'piece':'pieces'}`);
}
const all=resolveHomerInjuries(atlas,HOMER_INJURIES.map(x=>x.id));
assert.ok(all.length>0&&all.length<=atlas.parts.length);
console.log(`Verified ${HOMER_INJURIES.length} Homer injury controls against ${all.length} unique reference pieces.`);

const piano=matchInjuriesLocally('Struck on the head by a falling piano. ER notes a left frontal skull fracture and subarachnoid bleed; two fractured ribs on the left.');
assert.deepEqual([...piano.matches].sort(),['brain-hemorrhage','left-ribs-2-4','skull-fracture']);
assert.equal(piano.unmatched,null);
const ribs=matchInjuriesLocally('several broken ribs');
assert.ok(ribs.matches.includes('left-ribs-2-4')&&ribs.matches.includes('right-ribs-2-5'),'unspecified rib side suggests both sides');
const femur=matchInjuriesLocally('fractured femur after the crash');
assert.deepEqual(femur.matches,[]);assert.equal(femur.unmatched,'Femur fracture');
assert.equal(matchInjuriesLocally('nothing anatomical here').unmatched,'the injuries described');
assert.deepEqual(matchInjuriesLocally('   '),{matches:[],unmatched:null});
assert.equal(filterCatalogue('',[]).length,HOMER_INJURIES.length);
assert.deepEqual(filterCatalogue('rib',['left-ribs-2-4']).map(i=>i.id),['right-ribs-2-5','right-ribs-8-10','left-costal-cartilage-3-7']);
console.log('Verified local injury matching and catalogue filtering.');
