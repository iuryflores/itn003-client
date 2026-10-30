import {useEffect,useRef,useState} from 'react';
type Field={path:string;requirement:'required'|'conditional'|'optional';rule:string;types:string[];sources:string[]};
type Guide={version:string;guides:Record<string,Field[]>};
const labels={required:'Obrigatório',conditional:'Condicional',optional:'Opcional'};
export function FieldGuide({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [guide,setGuide]=useState<Guide|null>(null),[error,setError]=useState('');
 const [kind,setKind]=useState('rurais'),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const element=dialog.current!,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';element.showModal();
  return ()=>{element.close();document.body.style.overflow=overflow;};
 },[]);
 useEffect(()=>{
  const controller=new AbortController();setError('');
  void (async()=>{try{
   const response=await fetch('/api/field-guide',{signal:controller.signal});
   if(!response.ok)throw new Error('Não foi possível carregar a consulta de campos. Verifique se o servidor está atualizado e ativo.');
   const value=await response.json();if(!controller.signal.aborted)setGuide(value);
  }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Falha ao carregar os campos.');}})();
  return ()=>controller.abort();
 },[attempt]);
 const fields=guide?.guides[kind]??[];
 const visible=fields.filter(f=>(filter==='all'||f.requirement===filter)&&`${f.path} ${f.rule}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
 return <dialog ref={dialog} className="review-modal field-guide" aria-labelledby="field-guide-title" onCancel={onClose} onClick={event=>{
  if(event.target!==event.currentTarget)return;const bounds=event.currentTarget.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
 }}><div className="modal-header"><div><span className="eyebrow">REFERÊNCIA DE PREENCHIMENTO</span><h2 id="field-guide-title">Campos ITN003</h2><p>Anexos I e II · versão {guide?.version??'1.3.0'}</p></div><button className="modal-close" aria-label="Fechar consulta de campos" autoFocus onClick={onClose}>×</button></div><div className="modal-content">
 <div className="guide-legend"><p><strong>Obrigatório:</strong> exigido em todas as alternativas da estrutura.</p><p><strong>Condicional:</strong> exigido conforme ato, contexto ou outros campos.</p><p><strong>Opcional:</strong> pode ficar ausente; quando preenchido, precisa respeitar o formato e o contexto.</p></div>
 <p className="guide-note">As exceções de decisão judicial e abertura de ofício reduzem exigências. Por isso, campos usuais como data da matrícula podem aparecer como condicionais. Dentro de listas e objetos, a indicação vale para cada elemento informado. A auditoria do ato continua aplicando o schema completo.</p>
 <div className="guide-filters"><label>Tipo de imóvel<select value={kind} onChange={e=>setKind(e.target.value)}><option value="rurais">Rural</option><option value="urbanos">Urbano</option></select></label><label>Obrigatoriedade<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos os campos</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label} ({fields.filter(f=>f.requirement===value).length})</option>)}</select></label><label className="guide-search">Buscar campo ou regra<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: ccir, imposto, pessoa, matrícula…"/></label></div>
 {error?<div role="alert" className="error">{error} <button onClick={()=>setAttempt(n=>n+1)}>Tentar novamente</button></div>:!guide?<p role="status">Carregando campos…</p>:<><p role="status">{visible.length} de {fields.length} campos</p><div className="table-wrap"><table><thead><tr><th>Campo no JSON</th><th>Obrigatoriedade</th><th>Quando preencher / observações</th></tr></thead><tbody>{visible.map(field=><tr key={field.path}><td><code>{field.path}</code>{field.types.length>0&&<small>{field.types.join(' / ')}</small>}</td><td><span className={`badge ${field.requirement==='required'?'invalid':field.requirement==='conditional'?'review':'valid'}`}>{labels[field.requirement]}</span></td><td>{field.rule}<details><summary>Consultar fonte</summary><p>Anexo I · {field.path.startsWith('imoveis[].dados_')?'§4 — estruturas aninhadas':field.path.startsWith('imoveis[].')?'§3 — estrutura do imóvel':'§2 — raiz do arquivo'}. As classificações consideram as alternativas do Anexo II; as observações resumem o manual.</p>{field.sources.map(source=><small className="guide-source" key={source}>{source}</small>)}</details></td></tr>)}</tbody></table>{!visible.length&&<p className="empty">Nenhum campo encontrado com esses filtros.</p>}</div></>}
 </div><div className="modal-footer"><span>Consulta disponível sem importar um arquivo.</span><button className="primary" onClick={onClose}>Fechar</button></div></dialog>;
}
