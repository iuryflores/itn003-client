import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyDescription} from '../src/legacy-context.ts';
test('legacy titles are displayed only after a unique match',()=>{
 assert.equal(legacyDescription(undefined),null);
 assert.equal(legacyDescription({status:'ambiguous',record:{title:'Não usar'}}),null);
 assert.equal(legacyDescription({status:'matched',record:{title:'Dados do imóvel',service:'Serviço'}}),'Dados do imóvel');
 assert.equal(legacyDescription({status:'matched',record:{title:' ',service:'Qualificação das partes'}}),'Qualificação das partes');
});
