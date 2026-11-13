import {useEffect,useState} from 'react';
// Anexo I da ITN 003, versão 1.3: manual rural p. 18; urbano p. 17.
const propertyChanges=['Aluvião','Avulsão','Desdobro','Desmembramento','Divisão','Estremação','Formação de ilha','Loteamento','Regularização fundiária','Retificação','Unificação','Outro'];
type Field={example?:string;path:string;types:string[]};
export function PendingFieldsEditor({data,issues,changes,disabled,onApply}:{data:unknown;issues:{path:string}[];changes:Record<string,unknown>;disabled:boolean;onApply:(changes:Record<string,unknown>)=>Promise<void>}){
 const [fields,setFields]=useState<Field[]>([]),[error,setError]=useState('');
 const [draft,setDraft]=useState<Record<string,string>>({});
 const [addedFields,setAddedFields]=useState<string[]>([]);
 const record=(data??{}) as Record<string,unknown>;
 useEffect(()=>{
  const controller=new AbortController();
  void fetch('/api/field-guide',{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error('Não foi possível carregar os campos.');
   const guide=await response.json();setFields(guide.guides[record.tipo_imovel===1?'urbanos':'rurais'].filter((field:Field)=>/^imoveis\[\]\.[^.]+$/.test(field.path)).map((field:Field)=>({...field,path:field.path.slice('imoveis[].'.length)})));
  }).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
  return ()=>controller.abort();
 },[record.tipo_imovel]);
 const names=new Set([...issues.map(issue=>issue.path.split('/')[1]),...Object.keys(changes),...addedFields,...(record.tipo_imovel===2?['cod_sncr']:[])]);
 const available=fields.filter(field=>!['ato','valor_imposto'].includes(field.path));
 const editable=available.filter(field=>!field.path.includes('.')&&names.has(field.path)&&!['ato','valor_imposto'].includes(field.path));
 async function apply(field:Field,restore=false){
  setError('');
  try{
   const next={...changes};
   if(restore)delete next[field.path];
   else {
    const text=draft[field.path]??format(record[field.path]);
    if(!text.trim())throw new Error('Preencha o campo antes de aplicar.');
    next[field.path]=field.types.includes('string')?text:JSON.parse(text);
   }
   await onApply(next);
   setDraft(previous=>{const next={...previous};delete next[field.path];return next;});
  }catch(error){setError(error instanceof Error?error.message:'Não foi possível aplicar o campo.');}
 }
 function format(value:unknown){return value===undefined?'':typeof value==='string'?value:JSON.stringify(value,null,2);}
 return <section className="pending-fields-editor"><h3>Preencher e corrigir campos</h3><p>Os valores aplicados entram no JSON final. As pendências são recalculadas ao aplicar.</p><label>Adicionar campo para edição<select aria-label="Adicionar campo para edição" disabled={disabled} value="" onChange={event=>{if(event.target.value)setAddedFields(previous=>[...previous,event.target.value]);}}><option value="">Selecione um campo…</option>{available.filter(field=>!names.has(field.path)).map(field=><option key={field.path} value={field.path}>{field.path}</option>)}</select></label>{editable.map(field=><div className="pending-field" key={field.path}><p>Valor atual: <code>{record[field.path]===undefined?'Não informado':field.path==='alteracao_imovel'&&typeof record[field.path]==='number'&&propertyChanges[Number(record[field.path])-1]?`${record[field.path]} — ${propertyChanges[Number(record[field.path])-1]}`:format(record[field.path])}</code></p><label>{field.path}{field.path==='alteracao_imovel'?<select disabled={disabled} value={draft[field.path]??format(record[field.path])} onChange={event=>setDraft(previous=>({...previous,[field.path]:event.target.value}))}><option value="">Selecione o código…</option>{propertyChanges.map((description,index)=><option key={index+1} value={index+1}>{index+1} — {description}</option>)}<option value="null">Não informado (null)</option></select>:field.types.includes('string')?<input placeholder={field.example} disabled={disabled} value={draft[field.path]??format(record[field.path])} onChange={event=>setDraft(previous=>({...previous,[field.path]:event.target.value}))}/>:<textarea disabled={disabled} aria-label={field.path} placeholder={field.types.includes('boolean')?'true ou false':'Valor em formato JSON'} value={draft[field.path]??format(record[field.path])} onChange={event=>setDraft(previous=>({...previous,[field.path]:event.target.value}))}/>}</label>{field.example&&<small>Exemplo de formato: <code>{field.example}</code> (ilustrativo; use os dados reais).</small>}{!field.types.includes('string')&&<small>Formato JSON ({field.types.join(' / ')}). Para listas e objetos, preencha a estrutura completa.</small>}<div className="actions"><button disabled={disabled} onClick={()=>void apply(field)}>Aplicar {field.path}</button>{Object.hasOwn(changes,field.path)&&<button disabled={disabled} onClick={()=>void apply(field,true)}>Restaurar original</button>}</div></div>)}{!editable.length&&<p>Selecione um campo acima para visualizar e editar seu valor. Classificação e imposto possuem controles próprios abaixo.</p>}<small>Após aplicar, os valores são salvos automaticamente em até 30 segundos. Você também pode usar “Salvar andamento”. O arquivo original é preservado.</small>{error&&<p role="alert">{error}</p>}</section>;
}
