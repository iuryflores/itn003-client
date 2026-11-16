import {useEffect,useState} from 'react';
import {sharedPropertyFields} from './record-details';

export type EditableIssue={path:string;rule:string;message?:string;types?:string[]};
type Props={
 issue:EditableIssue;
 data:unknown;
 disabled:boolean;
 onApply:(path:string,value:string|null)=>Promise<void>;
};

export function PendingFieldEditor({issue,data,disabled,onApply}:Props){
 const {path,rule,types=[]}=issue;
 const parts=path==='/'?[]:path.slice(1).split('/').map(part=>part.replaceAll('~1','/').replaceAll('~0','~'));
 const current=parts.reduce<unknown>((value,key)=>value&&typeof value==='object'&&Object.hasOwn(value,key)
  ?(value as Record<string,unknown>)[key]:undefined,data);
 const field=parts.at(-1)??'Estrutura do ato';
 const sncr=field==='cod_sncr';
 const area=/^area_terreno_(total|uniao)$/.test(field);
 const allowed=types.filter(type=>type!=='null');
 const existingType=Array.isArray(current)?'array':current===null?'null':typeof current;
 const type=allowed.includes(existingType)?existingType:allowed.includes('string')?'string':allowed.length===1?allowed[0]:
  allowed.includes('number')?'number':allowed.includes('integer')?'integer':'json';
 const mode=sncr?'string':type;
 const initialValue=current===undefined||current===null?'':mode==='string'?String(current):JSON.stringify(current,null,2);
 const [value,setValue]=useState(initialValue);
 useEffect(()=>setValue(initialValue),[initialValue]);
 const existingArea=current&&typeof current==='object'?current as Record<string,unknown>:undefined;
 const [amount,setAmount]=useState(String(existingArea?.valor??''));
 const [unit,setUnit]=useState(String(existingArea?.unidade??''));
 const [error,setError]=useState('');

 async function apply(remove=false){
  setError('');
  try{
   const entered=value.trim();
   let json:string|null=null;
   if(!remove){
    if(sncr&&!/^(?:\d{12}|\d{13}|\d{3}\.\d{3}\.\d{3}\.\d{3}-\d)$/.test(entered)){
     throw new Error('Informe 12 ou 13 dígitos, ou use o formato 000.000.000.000-0.');
    }
    if(area){
     const decimal=amount.trim().replace(',','.');
     if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(decimal)||!unit)throw new Error('Informe uma área válida e selecione a unidade.');
     json='{"valor":'+decimal+',"unidade":'+unit+'}';
    }else if(mode==='string'){
     json=JSON.stringify(entered);
    }else{
     json=['number','integer'].includes(mode)?entered.replace(',','.'):entered;
     let parsed:unknown;
     try{parsed=JSON.parse(json);}catch{throw new Error('Confira o formato do valor antes de aplicar.');}
     if((mode==='number'&&(typeof parsed!=='number'||!Number.isFinite(parsed)))||
      (mode==='integer'&&!Number.isInteger(parsed))||(mode==='array'&&!Array.isArray(parsed))||
      (mode==='object'&&(!parsed||typeof parsed!=='object'||Array.isArray(parsed)))){
      throw new Error('O valor precisa ter o formato indicado para este campo.');
     }
    }
   }
   await onApply(path,json);
  }catch(error){setError(error instanceof Error?error.message:'Não foi possível aplicar a correção.');}
 }

 const label=sncr?'Código SNCR':field;
 return <div className="pending-field-editor">
  {rule!=='additionalProperties'&&(area
   ?<><label>Valor da área<input inputMode="decimal" value={amount} disabled={disabled} onChange={event=>setAmount(event.target.value)}/></label>
    <label>Unidade de medida<select value={unit} disabled={disabled} onChange={event=>setUnit(event.target.value)}>
     <option value="">Selecione</option><option value="1">Metros quadrados (m²)</option><option value="2">Hectares (ha)</option>
    </select></label></>
   :<label>{label}
    {mode==='boolean'?<select value={value} disabled={disabled} onChange={event=>setValue(event.target.value)}>
     <option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option>
    </select>:['array','object','json'].includes(mode)?<textarea value={value} disabled={disabled} onChange={event=>setValue(event.target.value)}
     placeholder={mode==='array'?'[ ]':mode==='object'?'{ }':'Valor em JSON'}/>:<input value={value} disabled={disabled}
     inputMode={mode==='number'||mode==='integer'?'decimal':undefined} onChange={event=>setValue(event.target.value)}/>}
   </label>)}
  {sncr&&<small>12 ou 13 dígitos. Também aceita o formato 000.000.000.000-0.</small>}
  {sharedPropertyFields.has(path)&&<small>A correção também vale para os outros atos da mesma matrícula nesta auditoria.</small>}
  {rule!=='additionalProperties'&&!area&&['array','object','json'].includes(mode)&&
   <small>{mode==='array'?'Informe a lista no formato JSON.':mode==='object'?'Informe o objeto no formato JSON.':'Informe o valor no formato JSON.'}</small>}
  <div className="actions">
   {rule!=='additionalProperties'&&<button disabled={disabled||(!area&&!value.trim())} onClick={()=>void apply()}>Aplicar correção</button>}
   {rule==='additionalProperties'&&<button disabled={disabled} onClick={()=>void apply(true)}>Remover campo</button>}
  </div>
  {error&&<p role="alert" className="classification-error">{error}</p>}
 </div>;
}
