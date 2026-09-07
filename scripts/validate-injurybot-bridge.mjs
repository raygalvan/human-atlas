import assert from 'node:assert/strict';
import {INJURYBOT_ATLAS_PROTOCOL,parseInjuryBotHostMessage,readInjuryBotHostConfig} from '../app/injurybot-bridge.ts';

const config=readInjuryBotHostConfig('?embed=injurybot&parentOrigin=https%3A%2F%2Finjury.bot&caseId=homer-cortez&caseTitle=Homer%20Cortez');
assert.deepEqual(config,{embedded:true,parentOrigin:'https://injury.bot',initialCase:{id:'homer-cortez',title:'Homer Cortez'}});
assert.equal(readInjuryBotHostConfig('?embed=injurybot&parentOrigin=not-a-url').parentOrigin,null);

const message=parseInjuryBotHostMessage({type:'injurybot:atlas:init',version:INJURYBOT_ATLAS_PROTOCOL,case:{id:'homer-cortez',title:'Homer Cortez',matterNumber:'HC-2026',findings:[],activeReferenceGroups:[]}});
assert.equal(message?.case.id,'homer-cortez');
assert.equal(parseInjuryBotHostMessage({type:'injurybot:atlas:init',version:99,case:{}}),null);
assert.equal(parseInjuryBotHostMessage({type:'injurybot:atlas:init',version:1,case:{id:'x',title:'x',findings:[{id:'f',anatomicalStructure:'rib',sourceStatus:'verified',placementStatus:'approved',renderStatus:'approved',sourceIds:[]}],activeReferenceGroups:[]}}),null);
console.log('Verified Injury.bot host configuration, origin parsing, protocol version, and case payload validation.');
