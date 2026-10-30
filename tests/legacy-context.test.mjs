import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyDescription} from '../src/legacy-context.ts';
test('legacy titles are displayed only after a unique match',()=>{
 assert.equal(legacyDescription(undefined),null);
 assert.equal(legacyDescription({status:'ambiguous',record:{title:'Não usar'}}),null);
 assert.equal(legacyDescription({status:'matched',record:{title:'Dados do imóvel',service:'Serviço'}}),'Dados do imóvel');
 assert.equal(legacyDescription({status:'matched',record:{title:' ',service:'Qualificação das partes'}}),'Qualificação das partes');
});
import {valuationEntries} from '../src/legacy-context.ts';
test('valuation values retain provenance and zero without being converted into tax',()=>{
 const entries=valuationEntries({status:'matched',record:{valuationValues:'0',valuationDto:'125000.00',valuationDoi:'130000.00'}});
 assert.deepEqual(entries,[{value:'0',source:'ato.valores.valorAvaliacao'},{value:'125000.00',source:'ato.dto.valorAvaliacao'},{value:'130000.00',source:'ato.doi_valor_avaliacao'}]);
 assert.deepEqual(valuationEntries({status:'ambiguous',record:{valuationValues:'1'}}),[]);
 assert.deepEqual(valuationEntries({status:'matched',record:{valuationValues:' ',valuationDto:null}}),[]);
});
