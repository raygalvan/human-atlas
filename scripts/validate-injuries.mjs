import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HOMER_INJURIES,resolveHomerInjury,resolveHomerInjuries} from '../app/injuries.ts';
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
