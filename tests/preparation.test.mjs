import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excludedIndices, readPreparation, reviewCounts } from '../src/preparation.ts';
const raw='{"version":"1.3.0","cns":"123456","imoveis":[{"id":"same","n":9007199254740993},{"id":"same"},{"id":"third"}]}';
const draft={kind:'itn003-preparation',version:1,file:'original.json',raw,decisions:{0:'keep',1:'exclude'},reasons:{1:'Revisar no sistema de origem'}};

test('registry is preserved in portable preparation; old files need explicit assignment by the screen',()=>{
 for(const registry of ['1RIGO','2RIGO'])assert.equal(readPreparation({...draft,registry}).registry,registry);
 assert.equal(readPreparation(draft).registry,undefined);
 for(const registry of ['3RIGO','',null,{},1])assert.throws(()=>readPreparation({...draft,registry}),/Cartório/);
});
test('queue distinguishes decisions by original index, including duplicate records',()=>{
 assert.deepEqual(reviewCounts([0,1,2],draft.decisions),{pending:1,kept:1,excluded:1});
 const completed={...draft.decisions,2:'keep'};
 assert.deepEqual(excludedIndices([0,1,2],completed),[1]);
 delete completed[0];
 assert.deepEqual(reviewCounts([0,1,2],completed),{pending:1,kept:1,excluded:1});
});
test('final export requires a completed queue and at least one retained act',()=>{
 assert.throws(()=>excludedIndices([0,1,2],draft.decisions),/revisão/);
 assert.throws(()=>excludedIndices([0,1],{0:'exclude',1:'exclude'}),/pelo menos/);
 assert.deepEqual(excludedIndices([0,1],{0:'keep',1:'keep'}),[]);
});
test('saving and reopening preserves original tokens, decisions and annotations',()=>{
 const restored=readPreparation(JSON.parse(JSON.stringify(draft)));
 assert.equal(restored.raw,raw);
 assert.ok(restored.raw.includes('9007199254740993'));
 assert.deepEqual(restored.decisions,draft.decisions);
 assert.deepEqual(restored.reasons,draft.reasons);
 assert.deepEqual(reviewCounts([0,1,2],restored.decisions),{pending:1,kept:1,excluded:1});
});
test('rejects invalid or incompatible preparations before replacing a session',()=>{
 for(const invalid of [null,{}, {...draft,version:2},{...draft,raw:'{'},{...draft,raw:'{}'},{...draft,decisions:{3:'keep'}},{...draft,decisions:{0:'pending'}},{...draft,decisions:{'01':'keep'}},{...draft,reasons:{0:123}}])assert.throws(()=>readPreparation(invalid));
});
test('classification overrides survive portable preparations and reject invalid codes',()=>{
 const restored=readPreparation({...draft,classifications:{0:5}});
 assert.deepEqual(restored.classifications,{0:5});assert.equal(restored.raw,raw);
 assert.deepEqual(readPreparation(draft).classifications,{});
 for(const changes of [{0:7},{0:'5'},{3:5},{'-1':5},{'00':3},[]])assert.throws(()=>readPreparation({...draft,classifications:changes}));
});

test('manual tax values and provenance survive portable preparation, with exact decimals',()=>{
 const taxOverrides={0:{value:'9007199254740993.1200',source:'ato.valores.valorAvaliacao'},1:{value:'0',source:'ato.doi_valor_avaliacao'}};
 const restored=readPreparation(JSON.parse(JSON.stringify({...draft,taxOverrides})));
 assert.deepEqual(restored.taxOverrides,taxOverrides);assert.equal(restored.raw,raw);
 assert.deepEqual(readPreparation(draft).taxOverrides,{});
 for(const changes of [[],{3:taxOverrides[0]},{'-1':taxOverrides[0]},{'00':taxOverrides[0]},{0:{value:'1,20',source:taxOverrides[0].source}},{0:{value:'-1',source:taxOverrides[0].source}},{0:{value:1,source:taxOverrides[0].source}},{0:{value:'1',source:'other'}}])assert.throws(()=>readPreparation({...draft,taxOverrides:changes}));
});
