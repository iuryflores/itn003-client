export type TaxOverride={value:string;source:string};
const sources=['ato.valores.valorAvaliacao','ato.dto.valorAvaliacao','ato.doi_valor_avaliacao'];
export function canUseValuation(value:string) {return /^(?:0|[1-9]\d{0,19})(?:\.\d{1,10})?$/.test(value);}
export function readTaxOverrides(value:unknown,items:unknown[]):Record<number,TaxOverride> {
 const overrides=value??{};
 if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))throw new Error('Alterações de imposto inválidas.');
 const result:Record<number,TaxOverride>={};
 for(const [key,entry] of Object.entries(overrides)){
  const index=Number(key);
  if(!/^\d+$/.test(key)||!Number.isSafeInteger(index)||String(index)!==key||index>=items.length||!items[index]||typeof items[index]!=='object'||Array.isArray(items[index]))throw new Error('O imposto referencia um ato inexistente.');
  if(!entry||typeof entry!=='object'||typeof entry.value!=='string'||!canUseValuation(entry.value)||!sources.includes(entry.source))throw new Error('Valor ou origem do imposto inválidos.');
  result[index]={value:entry.value,source:entry.source};
 }
 return result;
}
