import {valuationEntries} from './legacy-context';
import type {LegacyMatch} from './legacy-context';
import {useState} from 'react';
import {canUseValuation} from './tax-overrides';
import type {TaxOverride} from './tax-overrides';
type Props={match:LegacyMatch|undefined;taxOverride?:TaxOverride;currentTax?:unknown;disabled?:boolean;onUse:(value:TaxOverride|undefined)=>Promise<void>};
export function LegacyValuation({match,taxOverride,currentTax,disabled,onUse}:Props) {
 const [error,setError]=useState('');
 const [applying,setApplying]=useState(false);
 async function apply(value:TaxOverride|undefined){
  setError('');setApplying(true);
  try{await onUse(value);}catch(error){setError(error instanceof Error?error.message:'Não foi possível aplicar o valor.');}finally{setApplying(false);}
 }
 if(match?.status!=='matched'&&!taxOverride)return null;
 const entries=valuationEntries(match);
 return <section className="legacy-valuation"><h3>Valor de avaliação no legado</h3>{entries.length?<dl>{entries.map(entry=><div key={entry.source}><dt>{entry.source}</dt><dd>{entry.value}<button disabled={disabled||applying||!canUseValuation(entry.value)||(taxOverride?.value===entry.value&&taxOverride.source===entry.source)} onClick={()=>void apply(entry)}>Usar como valor do imposto</button>{!canUseValuation(entry.value)&&<small>Formato numérico incompatível para aplicação.</small>}</dd></div>)}</dl>:<p>{match?.status==='matched'?'Não encontrado nos campos consultados.':'Consulte o legado para ver os valores atuais.'}</p>}<p>valor_imposto atual: <strong>{taxOverride?.value??String(currentTax??'Não informado')}</strong></p>{taxOverride&&<div><p>Aplicado manualmente de {taxOverride.source}.</p><button disabled={disabled||applying} onClick={()=>void apply(undefined)}>Restaurar valor do arquivo original</button></div>}{error&&<p role="alert">{error}</p>}<small>A aplicação substitui valor_imposto neste ato e recalcula as pendências. Use “Salvar andamento” para guardar sua escolha.</small></section>;
}
