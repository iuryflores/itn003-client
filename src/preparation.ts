import {isRegistry} from './registry.ts';
import type {Registry} from './registry.ts';
import {readTaxOverrides} from './tax-overrides.ts';
import type {TaxOverride} from './tax-overrides.ts';
export type Decision = 'keep' | 'exclude';
export type Decisions = Record<number, Decision>;
export type Preparation = {
  kind: 'itn003-preparation'; version: 1; registry?:Registry; name?:string; file: string; raw: string;
  fieldOverrides?:Record<number,Record<string,unknown>>;
  taxOverrides?:Record<number,TaxOverride>;
  classifications?:Record<number,number>;
  decisions: Decisions; reasons: Record<number, string>;
};
export function reviewCounts(indices:number[], decisions:Decisions) {
  return indices.reduce((counts,index)=>{
    const decision=decisions[index];
    if(decision==='keep')counts.kept++;
    else if(decision==='exclude')counts.excluded++;
    else counts.pending++;
    return counts;
  },{pending:0,kept:0,excluded:0});
}
export function excludedIndices(indices:number[], decisions:Decisions) {
  const counts=reviewCounts(indices,decisions);
  if(counts.pending)throw new Error(`Ainda há ${counts.pending} ato(s) na fila de revisão.`);
  if(!counts.kept)throw new Error('Mantenha pelo menos um ato para gerar o JSON final.');
  return indices.filter(index=>decisions[index]==='exclude');
}
export function readPreparation(value:unknown):Preparation {
  if(!value||typeof value!=='object')throw new Error('Preparação inválida.');
  const draft=value as Record<string,unknown>;
  if(draft.kind!=='itn003-preparation'||draft.version!==1||typeof draft.raw!=='string'||typeof draft.file!=='string')throw new Error('Formato de preparação inválido ou versão não suportada.');
  if(draft.registry!==undefined&&!isRegistry(draft.registry))throw new Error('Cartório inválido na preparação.');
  if(draft.name!==undefined&&(typeof draft.name!=='string'||draft.name.length>160))throw new Error('Nome da auditoria inválido.');
  let source;
  try{source=JSON.parse(draft.raw.replace(/^\uFEFF/,''));}catch{throw new Error('O arquivo original da preparação está inválido.');}
  if(!source||!Array.isArray(source.imoveis))throw new Error('A preparação não contém a lista original de imóveis.');
  const count=source.imoveis.length;
  for(const [name,values] of [['decisions',draft.decisions],['reasons',draft.reasons]] as const){
    if(!values||typeof values!=='object'||Array.isArray(values))throw new Error(`Preparação inválida: ${name}.`);
    for(const [key,value] of Object.entries(values)){
      const index=Number(key);
      if(!/^\d+$/.test(key)||!Number.isSafeInteger(index)||String(index)!==key||index<0||index>=count)throw new Error('Preparação contém um registro inexistente.');
      if(name==='decisions'&&value!=='keep'&&value!=='exclude')throw new Error('Decisão inválida na preparação.');
      if(name==='reasons'&&typeof value!=='string')throw new Error('Anotação inválida na preparação.');
    }
  }
  const classifications=draft.classifications??{};
  if(!classifications||typeof classifications!=='object'||Array.isArray(classifications))throw new Error('Classificações inválidas na preparação.');
  for(const [key,value] of Object.entries(classifications)){
   const index=Number(key);
   if(!/^\d+$/.test(key)||!Number.isSafeInteger(index)||String(index)!==key||index>=count||!source.imoveis[index]||typeof source.imoveis[index]!=='object'||Array.isArray(source.imoveis[index])||typeof value!=='number'||!Number.isInteger(value)||value<1||value>6)throw new Error('Classificação inválida na preparação.');
  }
  return {...draft,classifications,taxOverrides:readTaxOverrides(draft.taxOverrides,source.imoveis)} as unknown as Preparation;
}
