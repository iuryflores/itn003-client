import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geographicDetails, isOtherAct } from '../src/record-details.ts';
test('georeferencing uses explicit declaration and does not infer it from other fields',()=>{
 assert.equal(geographicDetails({georreferenciamento:true}).label,'Sim');
 assert.equal(geographicDetails({georreferenciamento:false,certificacao_incra:true,numero_poligono:5,coordenadas:'[1,2]'}).label,'Não');
 assert.equal(geographicDetails({certificacao_incra:true}).label,'Não informado');
 assert.equal(geographicDetails({georreferenciamento:'false'}).label,'Valor inválido');
});
test('shows polygon, certification and coordinates independently',()=>{
 const details=geographicDetails({georreferenciamento:true,certificacao_incra:false,numero_poligono:0,coordenadas:'[1,2]'});
 assert.equal(details.polygon,'0');assert.equal(details.certification,'Não');assert.equal(details.coordinates,'[1,2]');
 assert.equal(geographicDetails(null).coordinates,null);
 assert.equal(geographicDetails({coordenadas:' '}).coordinates,null);
});
test('other classification follows ato, not its sequential number',()=>{
 assert.equal(isOtherAct({ato:6,numero_ato:'14'}),true);
 assert.equal(isOtherAct({ato:4,numero_ato:'6'}),false);
 assert.equal(isOtherAct(null),false);
});
