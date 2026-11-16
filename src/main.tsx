import {SavedAuditsDialog} from './SavedAuditsDialog';
import {isRegistry,registryLabels} from './registry';
import type {Registry} from './registry';
import {FieldGuide} from './FieldGuide';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { excludedIndices, readPreparation, reviewCounts } from './preparation';
import type { Decision, Decisions, FieldEdit, Preparation } from './preparation';
import { geographicDetails, isOtherAct, compactActReference, propertyEditTargets } from './record-details';
import { legacyDescription } from './legacy-context';
import type { LegacyMatch } from './legacy-context';
import { MinuteViewer } from './MinuteViewer';
import { MinuteModal } from './MinuteModal';
import { ClassificationEditor } from './ClassificationEditor';
import {PropertyChangeEditor} from './PropertyChangeEditor';
import { LegacyValuation } from './LegacyValuation';
import type { TaxOverride } from './tax-overrides';
import {PendingFieldEditor} from './PendingFieldEditor';
import type {EditableIssue} from './PendingFieldEditor';
type Issue = EditableIssue & {category?:string;requirement?:string;explanation?:string;path:string; message:string; source:string; rule:string};
type Item = {requiredFields?:EditableIssue[];originalAct?:number|null;documentationNotes?:{path:string;message:string;source:string}[];recordType?:string;act:string;actNumber:string;actDate:string;actType:string;rawIssues:Issue[];index:number; label:string; type:string; reason:string; status:'valid'|'invalid'|'review'; issues:Issue[]; guidance:string; data:unknown};
type SavedPreparation={registry?:Registry;name?:string;id:string;revision:string;file:string;updatedAt:string;total:number;pending:number;kept:number;excluded:number};
type Result = {rootIssues:Issue[]; items:Item[]; schemaVersion:string};
const titles = {valid:'Schema válido',invalid:'Erro de estrutura',review:'Revisar acervo'};
function recordIdentity(item:Item) {
 const data=item.data && typeof item.data==='object' ? item.data as Record<string,unknown> : {};
 const type=data.tipo_matricula_transcricao===1?'Matrícula':data.tipo_matricula_transcricao===2?'Transcrição':'Tipo de registro não informado';
 const number=data.tipo_matricula_transcricao===1?data.numero_matricula:data.tipo_matricula_transcricao===2?data.numero_transcricao:undefined;
 return {type,number:String(number??'Número não informado')};
}
async function request(path:string, body:unknown) {
 const response = await fetch(`/api/${path}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if (!response.ok) { const error = await response.json().catch(()=>null); throw new Error(error?.message ?? 'Não foi possível processar. Verifique se o servidor está ativo.'); }
 return response;
}
function download(content:Blob, name:string) { const url = URL.createObjectURL(content); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function LegacyDetails({match,registry}:{match:LegacyMatch|undefined;registry:Registry}) {
 const record=match?.status==='matched'?match.record:undefined;
 return <div className="legacy-details"><h3>Dados do sistema legado</h3>{!match?<p>Use “Consultar atos do JSON” para buscar os títulos, serviços e datas deste ato no legado.</p>:<><p>{match.message}</p>{record&&<><dl><div><dt>Título do ato</dt><dd>{record.title||'Não informado'}</dd></div><div><dt>Serviço</dt><dd>{record.service||'Não informado'}</dd></div><div><dt>Tipo no legado</dt><dd>{record.actKind}</dd></div><div><dt>Data de registro</dt><dd>{record.registeredAt||'Não informada'}</dd></div><div><dt>Data de selagem</dt><dd>{record.sealedAt||'Não informada'}</dd></div><div><dt>Classificação ITN003</dt><dd>{record.classification||'Não informada'}</dd></div><div><dt>Georreferenciamento no legado</dt><dd>{record.georeferencing===true?'Sim':record.georeferencing===false?'Não':'Não informado'}</dd></div></dl>{record.cancelled&&<p className="missing-description">Este ato consta como cancelado no legado. Revise antes de manter.</p>}<MinuteViewer registry={registry} key={`${registry}:${record.id}`} actId={record.id}/></>}</>}<small>Consulta somente de leitura. Estes dados complementam a revisão e não alteram o JSON original.</small></div>;
}
function PendingModal({item,onClose,onReview}:{item:Item;onClose:()=>void;onReview:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const element=dialog.current!;const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';element.showModal();
  return ()=>{element.close();document.body.style.overflow=overflow;};
 },[]);
 const groups=[
  {title:'Campos faltantes',fields:[...new Set(item.issues.filter(issue=>issue.rule==='required').map(issue=>issue.path))]},
  {title:'Campos com valor ou formato inválido',fields:[...new Set(item.issues.filter(issue=>issue.rule!=='required').map(issue=>issue.path))]},
 ];
 const fieldName=(path:string)=>path==='/'?'Estrutura do ato':path.replace(/^\//,'').replace(/\/(\d+)(?=\/|$)/g,'[$1]').replaceAll('/','.');
 return <dialog ref={dialog} className="review-modal pending-modal" aria-labelledby="pending-title" onCancel={onClose} onClick={event=>{
  if(event.target!==event.currentTarget)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
 }}><div className="modal-header"><div><span className="eyebrow">PENDÊNCIAS</span><h2 id="pending-title">{recordIdentity(item).type} {recordIdentity(item).number}</h2><p>{item.actType} {item.actNumber}</p></div><button className="modal-close" aria-label="Fechar pendências" autoFocus onClick={onClose}>×</button></div><div className="modal-content">{groups.filter(group=>group.fields.length>0).map(group=><section className="pending-group" key={group.title}><h3>{group.title}</h3><ul>{group.fields.map(field=><li key={field}><code>{fieldName(field)}</code></li>)}</ul></section>)}{!item.issues.length&&<p>Sem pendências.</p>}</div><div className="modal-footer"><button onClick={onReview}>Abrir revisão completa</button><button className="primary" onClick={onClose}>Fechar</button></div></dialog>;
}
function ReviewModal({registry,active,legacy,decision,reason,onReason,onDecide,onSave,saving,editing,classificationChanged,onClassify,propertyChanged,onPropertyChange,onFieldEdit,taxOverride,onTaxChange,onClose}: {
 registry:Registry;taxOverride?:TaxOverride;onTaxChange:(value:TaxOverride|undefined)=>Promise<void>; active:Item; legacy?:LegacyMatch; decision:Decision|undefined; reason:string; onReason:(reason:string)=>void; onDecide:(decision:Decision)=>void; onSave:()=>void; saving:boolean; editing:boolean;classificationChanged:boolean;onClassify:(code:number|undefined)=>Promise<void>; propertyChanged:boolean;onPropertyChange:(code:number|undefined)=>Promise<void>; onFieldEdit:(path:string,value:string|null)=>Promise<void>; onClose:()=>void;
}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const excluded=decision==='exclude';
 const geography=geographicDetails(active.data);
 const useDedicatedEditor=(path:string)=>path==='/ato'||path==='/alteracao_imovel'&&(active.data as Record<string,unknown>)?.ato===5;
 const requiredFields=[...new Map([
  ...(active.requiredFields??[]),
  ...active.issues.filter(issue=>issue.rule==='required'),
 ].map(issue=>[issue.path,issue])).values()];
 useEffect(()=>{
  const element=dialog.current!;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  element.showModal();
  return ()=>{element.close();document.body.style.overflow=previousOverflow;};
 },[]);
 return <dialog ref={dialog} className="review-modal" aria-labelledby="review-title" onCancel={onClose} onClick={event=>{
  if(event.target!==event.currentTarget)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
 }}>
  <div className="modal-header"><div><span className="eyebrow">REVISÃO DO REGISTRO {active.index+1}</span><h2 id="review-title">{recordIdentity(active).type} {recordIdentity(active).number}</h2><div className="act-heading"><strong className="act-identity">{active.actType} <b>{active.actNumber || "Número não informado"}</b></strong><span>Ato nº {active.actNumber || "não informado"}</span></div><div className="act-date-detail"><span>Data do ato</span><strong>{active.actDate || "Não informada no arquivo"}</strong></div><p>{active.type} · {active.act}</p>{legacyDescription(legacy)?<p className="legacy-description">{legacyDescription(legacy)} <small>· fonte: legado</small></p>:isOtherAct(active.data)&&<p className="missing-description">Descrição do ato “Outro”: não fornecida no JSON.</p>}</div><button className="modal-close" aria-label="Fechar revisão" autoFocus onClick={onClose}>×</button></div>
  <div className="modal-content"><div className="modal-status"><span className={`badge ${active.status}`}>{titles[active.status]}</span><span className={`badge ${excluded?'excluded-status':decision==='keep'?'valid':'review'}`}>{excluded?'Excluído da remessa':decision==='keep'?'Mantido na remessa':'Aguardando sua decisão'}</span></div><p className="modal-guidance">{active.guidance}</p>
   <div className="review-columns"><section>{requiredFields.length>0&&<details className="required-fields">
    <summary>Campos obrigatórios ({requiredFields.length})</summary>
    <div className="issues">{requiredFields.map(issue=><article key={issue.path}>
     <code>{issue.path}</code>
     {issue.message&&<p>{issue.message}</p>}
     {useDedicatedEditor(issue.path)
      ?<p>Use {issue.path==='/ato'?'Classificação do ato':'Tipo de alteração do imóvel'} nesta revisão.</p>
      :<PendingFieldEditor issue={issue} data={active.data} disabled={editing||saving} onApply={onFieldEdit}/>}
    </article>)}</div>
   </details>}<h3>O que corrigir ({active.issues.length})</h3><p className="modal-hint">Exigências do Anexo II, conforme o enquadramento do ato. Campos opcionais ausentes não geram pendência; quando preenchidos, devem respeitar o formato documentado.</p>{!active.issues.length&&<p className="success-message">Este registro atende ao schema fornecido.</p>}<div className="issues">{active.issues.map((issue,index)=><article key={issue.path+':'+issue.rule+':'+index}><span className="issue-kind">{issue.category==='missing_required'||issue.rule==='required'?'Preenchimento obrigatório':'Valor ou formato inválido'}</span><code>{issue.path}</code>{issue.requirement&&<p className="requirement-label">{issue.requirement}</p>}<p>{issue.message}</p>{issue.explanation&&<p>{issue.explanation}</p>}<small>{issue.source}</small>{!useDedicatedEditor(issue.path)&&active.issues.findIndex(entry=>entry.path===issue.path)===index&&<PendingFieldEditor issue={issue} data={active.data} disabled={editing||saving} onApply={onFieldEdit}/>}</article>)}</div>{!!active.documentationNotes?.length&&<div className="documentation-notes"><h3>Observações da documentação</h3>{active.documentationNotes.map((note,index)=><article key={index}><code>{note.path}</code><p>{note.message}</p><small>{note.source}</small></article>)}</div>}</section>
   <section className="review-decision"><ClassificationEditor current={Number((active.data as Record<string,unknown>)?.ato)||0} original={active.originalAct} changed={classificationChanged} disabled={editing||saving} onApply={onClassify}/>{(active.data as Record<string,unknown>)?.ato===5&&<PropertyChangeEditor current={(active.data as Record<string,unknown>).alteracao_imovel} changed={propertyChanged} disabled={editing||saving} onApply={onPropertyChange}/>}<LegacyValuation match={legacy} taxOverride={taxOverride} currentTax={(active.data as Record<string,unknown>)?.valor_imposto} disabled={editing||saving} onUse={onTaxChange}/><LegacyDetails registry={registry} match={legacy}/><div className="geography-panel"><h3>Georreferenciamento</h3><dl><div><dt>Declarado no arquivo</dt><dd>{geography.label}</dd></div><div><dt>Certificação INCRA</dt><dd>{geography.certification}</dd></div><div><dt>Número do polígono</dt><dd>{geography.polygon}</dd></div><div><dt>Coordenadas</dt><dd>{geography.coordinates?'Informadas':'Não informadas'}</dd></div></dl>{geography.coordinates&&<details><summary>Ver coordenadas do arquivo</summary><pre>{geography.coordinates}</pre></details>}<small>Georreferenciamento e certificação são informações distintas, declaradas no JSON.</small></div><div className="validation-policy"><h3>Critério da auditoria</h3><p>Obrigatório: ausência gera pendência.</p><p>Condicional: exigido somente quando a condição se aplica.</p><p>Opcional: pode ficar ausente; se preenchido, precisa estar no formato aceito.</p><small>Base: manuais do Anexo I e schemas do Anexo II, versão 1.3.0. O relatório do legado não adiciona exigências.</small></div><h3>Sua decisão</h3><p>A exclusão é reversível e será aplicada ao exportar o JSON.</p><label className="note-label">Motivo da decisão<textarea placeholder="Anote o motivo da exclusão ou revisão…" value={reason} onChange={event=>onReason(event.target.value)}/></label><small>Use “Salvar andamento” para guardar as decisões e anotações no servidor e continuar depois.</small><details><summary>Visualizar JSON do imóvel</summary><pre>{JSON.stringify(active.data,null,2)}</pre></details><details><summary>Todos os erros técnicos ({active.rawIssues.length})</summary><pre>{JSON.stringify(active.rawIssues,null,2)}</pre></details></section></div>
  </div>
  <div className="modal-footer"><span>Ao decidir, o ato sai da fila de revisão.</span><div className="actions"><button disabled={saving||editing} onClick={onSave}>{saving?'Salvando…':'Salvar andamento'}</button><button onClick={onClose}>Revisar depois</button><button disabled={editing||saving} onClick={()=>onDecide('exclude')}>Excluir da remessa</button><button className="primary" disabled={editing||saving} onClick={()=>onDecide('keep')}>Manter e concluir</button></div></div>
 </dialog>;
}
function App() {
 const toolsMenu=useRef<HTMLDetailsElement>(null);
 const [registry,setRegistry]=useState<Registry|''>('');
 const [showFieldGuide,setShowFieldGuide]=useState(false);
 const [legacyMatches,setLegacyMatches]=useState<Record<number,LegacyMatch>>({});
 const [legacyFetchedAt,setLegacyFetchedAt]=useState('');
 const [legacyMessage,setLegacyMessage]=useState('Importe um JSON e clique em “Consultar atos do JSON” para complementar a auditoria.');
 const [legacyBusy,setLegacyBusy]=useState(false);
 async function checkLegacy() {
  setLegacyBusy(true);
  try {
   const response=await fetch(`/api/legacy/status?registry=${registry}`);const value=await response.json();
   if(!response.ok)throw new Error(value.message??'Não foi possível verificar a conexão.');
   setLegacyMessage(value.message);
  }catch(error){setLegacyMessage(error instanceof Error?error.message:'Não foi possível verificar a conexão.');}
  finally{setLegacyBusy(false);}
 }
 async function loadLegacyContext() {
  setLegacyBusy(true);
  try {
   const context=await (await request('legacy/context',{raw,registry})).json();
   const matches=context.matches as LegacyMatch[];
   setLegacyMatches(Object.fromEntries(matches.map(match=>[match.index,match])));
   setLegacyFetchedAt(context.fetchedAt);
   setLegacyMessage(`${matches.filter(match=>match.status==='matched').length} de ${matches.length} atos localizados. ${matches.filter(match=>match.status==='ambiguous').length} com identificação ambígua. O JSON original permanece preservado.`);
  }catch(error){setLegacyMessage(error instanceof Error?error.message:'Não foi possível consultar os atos.');}
  finally{setLegacyBusy(false);}
 }
 const [savedInfo,setSavedInfo]=useState<SavedPreparation|null>(null);
 const [savedSnapshot,setSavedSnapshot]=useState<Preparation|null>(null);
 const [saving,setSaving]=useState(false);
 const [savedList,setSavedList]=useState<SavedPreparation[]>([]);
 const [showSaved,setShowSaved]=useState(false);
 const [listBusy,setListBusy]=useState(false);
 const [taxOverrides,setTaxOverrides]=useState<Record<number,TaxOverride>>({});
 const [fieldEdits,setFieldEdits]=useState<FieldEdit[]>([]);
 const [propertyChanges,setPropertyChanges]=useState<Record<number,number>>({});
 const [classifications,setClassifications]=useState<Record<number,number>>({});
 const [auditName,setAuditName]=useState('');
 const [raw,setRaw]=useState(''); const [file,setFile]=useState(''); const [result,setResult]=useState<Result|null>(null);
 const [decisions,setDecisions]=useState<Decisions>({}); const [reasons,setReasons]=useState<Record<number,string>>({});
 const [view,setView]=useState('pending');
 const [geoFilter,setGeoFilter]=useState('all');
 const [pendingIndex,setPendingIndex]=useState<number|null>(null);
 const [minuteIndex,setMinuteIndex]=useState<number|null>(null);
 const [selected,setSelected]=useState<number|null>(null); const [query,setQuery]=useState(''); const [filter,setFilter]=useState('all');
 const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [page,setPage]=useState(0);
 const dirty=!!result&&(!savedSnapshot||savedSnapshot.registry!==registry||(savedSnapshot.name||savedSnapshot.file)!==(auditName.trim()||file)||savedSnapshot.taxOverrides!==taxOverrides||savedSnapshot.classifications!==classifications||savedSnapshot.propertyChanges!==propertyChanges||savedSnapshot.fieldEdits!==fieldEdits||savedSnapshot.raw!==raw||savedSnapshot.file!==file||savedSnapshot.decisions!==decisions||savedSnapshot.reasons!==reasons);
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};
  window.addEventListener('beforeunload',warn);
  return ()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 async function persistProgress():Promise<SavedPreparation|null> {
  if(!result)return null;
  const preparation:Preparation={kind:'itn003-preparation',version:1,registry:registry||undefined,name:auditName.trim()||file,file,raw,classifications,taxOverrides,propertyChanges,fieldEdits,decisions,reasons};
  setSaving(true);setError('');
  try {
   const saved=await (await request('preparations',{preparation,id:savedInfo?.id,revision:savedInfo?.revision})).json() as SavedPreparation;
   setSavedInfo(saved);setSavedSnapshot(preparation);
   setSavedList(previous=>[saved,...previous.filter(item=>item.id!==saved.id)]);
   return saved;
  }catch(error){setError(error instanceof Error?error.message:'Não foi possível salvar o andamento.');return null;}
  finally{setSaving(false);}
 }
 async function listPreparations() {
  if(toolsMenu.current)toolsMenu.current.open=false;
  setShowSaved(true);setListBusy(true);setError('');
  try {
   const response=await fetch('/api/preparations',{cache:'no-store'});const value=await response.json();
   if(!response.ok)throw new Error(value.message??'Não foi possível listar as auditorias.');
   setSavedList(value.items);
   if(value.unreadable)setError(`${value.unreadable} arquivo(s) salvo(s) não puderam ser lidos. As cópias existentes foram preservadas.`);
  }catch(error){setError(error instanceof Error?error.message:'Não foi possível listar as auditorias.');}
  finally{setListBusy(false);}
 }
 async function reopenSaved(id:string) {
  if(dirty&&!await persistProgress())return;
  setBusy(true);setError('');
  try {
   const response=await fetch(`/api/preparations/${encodeURIComponent(id)}`,{cache:'no-store'});const value=await response.json();
   if(!response.ok)throw new Error(value.message??'Não foi possível abrir a auditoria.');
   const preparation=readPreparation(value.preparation);
   const selectedRegistry=preparation.registry||registry;
   if(!selectedRegistry)throw new Error('Selecione o cartório ao qual pertence esta auditoria antiga antes de abri-la.');
   const audit=await (await request('audit',{raw:preparation.raw,classifications:preparation.classifications,taxOverrides:preparation.taxOverrides,propertyChanges:preparation.propertyChanges,fieldEdits:preparation.fieldEdits})).json();
   setRegistry(selectedRegistry);setTaxOverrides(preparation.taxOverrides??{});setClassifications(preparation.classifications??{});setPropertyChanges(preparation.propertyChanges??{});setFieldEdits(preparation.fieldEdits??[]);setRaw(preparation.raw);setFile(preparation.file);setAuditName(preparation.name||preparation.file);setDecisions(preparation.decisions);setReasons(preparation.reasons);setResult(audit);
   setSavedInfo(value);setSavedSnapshot(preparation);setShowSaved(false);setPendingIndex(null);setMinuteIndex(null);setSelected(null);setPage(0);setQuery('');setFilter('all');setGeoFilter('all');setView('pending');
   setLegacyMatches({});setLegacyFetchedAt('');setLegacyMessage('Auditoria reaberta. Consulte o legado novamente se precisar dos dados atuais.');
  }catch(error){setError(error instanceof Error?error.message:'Não foi possível abrir a auditoria.');}
  finally{setBusy(false);}
 }
 const indices=useMemo(()=>result?.items.map(i=>i.index)??[],[result]);
 const counts=reviewCounts(indices,decisions);
 const excluded=new Set(indices.filter(index=>decisions[index]==='exclude'));
 const filtered=useMemo(()=>result?.items.filter(i=>(view==='all'||view==='pending'&&!decisions[i.index]||view==='kept'&&decisions[i.index]==='keep'||view==='excluded'&&decisions[i.index]==='exclude')&&(filter==='all'||filter===i.status)&&(geoFilter==='all'||geographicDetails(i.data).status===geoFilter)&&`${compactActReference(i.data)} ${recordIdentity(i).type} ${recordIdentity(i).number} ${i.type} ${i.reason} ${i.act} ${i.actNumber} ${i.actDate} ${legacyDescription(legacyMatches[i.index])??''} ${i.issues.map(e=>e.path).join(" ")}`.toLowerCase().includes(query.toLowerCase()))??[],[result,filter,query,decisions,view,geoFilter,legacyMatches]);
 const pendingItem=result?.items.find(item=>item.index===pendingIndex);
 const minuteItem=result?.items.find(item=>item.index===minuteIndex);
 const active=result?.items.find(i=>i.index===selected);
 const lastPage=Math.max(0,Math.ceil(filtered.length/50)-1);
 useEffect(()=>{setPage(previous=>Math.min(previous,lastPage));},[lastPage]);
 async function reclassify(index:number,code:number|undefined) {
  const next={...classifications};
  const originalAct=result?.items.find(item=>item.index===index)?.originalAct;
  if(code===undefined||code===originalAct)delete next[index];else next[index]=code;
  const nextPropertyChanges={...propertyChanges};
  if((code??originalAct)!==5)delete nextPropertyChanges[index];
  setBusy(true);
  try {
   const audit=await (await request('audit',{raw,classifications:next,taxOverrides,propertyChanges:nextPropertyChanges,fieldEdits})).json();
   setResult(audit);setClassifications(next);setPropertyChanges(nextPropertyChanges);
   setDecisions(previous=>{const updated={...previous};delete updated[index];return updated;});
  }finally{setBusy(false);}
 }
 async function applyPropertyChange(index:number,code:number|undefined) {
  const nextFieldEdits=fieldEdits.filter(edit=>edit.index!==index||edit.path!=='/alteracao_imovel');
  const next={...propertyChanges};
  if(code===undefined)delete next[index];else next[index]=code;
  setBusy(true);
  try {
   const audit=await (await request('audit',{raw,classifications,taxOverrides,propertyChanges:next,fieldEdits:nextFieldEdits})).json();
   setResult(audit);
   setPropertyChanges(next);setFieldEdits(nextFieldEdits);
   reopen(index);
  }finally{setBusy(false);}
 }
 async function applyFieldEdit(index:number|undefined,path:string,value:string|null) {
  const targets=index===undefined?[undefined]:propertyEditTargets(result?.items??[],index,path);
  const next=[...fieldEdits,...targets.map(target=>({index:target,path,value}))];
  const nextTax={...taxOverrides};
  if(index!==undefined&&path==='/valor_imposto')delete nextTax[index];
  setBusy(true);
  try{
   const audit=await (await request('audit',{raw,classifications,taxOverrides:nextTax,propertyChanges,fieldEdits:next})).json();
   setResult(audit);
   setFieldEdits(next);
   setTaxOverrides(nextTax);
   if(index!==undefined)setDecisions(previous=>{
    const updated={...previous};
    for(const target of targets)if(target!==undefined)delete updated[target];
    return updated;
   });
  }finally{setBusy(false);}
 }
 async function applyTax(index:number,value:TaxOverride|undefined) {
  const nextFieldEdits=fieldEdits.filter(edit=>edit.index!==index||edit.path!=='/valor_imposto');
  const next={...taxOverrides};
  if(value===undefined)delete next[index];else next[index]=value;
  setBusy(true);
  try {
   const audit=await (await request('audit',{raw,classifications,taxOverrides:next,propertyChanges,fieldEdits:nextFieldEdits})).json();
   setResult(audit);setTaxOverrides(next);setFieldEdits(nextFieldEdits);
   setDecisions(previous=>{const updated={...previous};delete updated[index];return updated;});
  }finally{setBusy(false);}
 }
 function decide(index:number,decision:Decision) {setDecisions(previous=>({...previous,[index]:decision}));setSelected(null);}
 function reopen(index:number) {setDecisions(previous=>{const next={...previous};delete next[index];return next;});}
 async function changeRegistry(value:string){
  if(value!==''&&!isRegistry(value))return;
  if(value===registry)return;
  if(dirty&&!await persistProgress())return;
  setRegistry(value);setResult(null);setRaw('');setFile('');setAuditName('');setDecisions({});setReasons({});setClassifications({});setPropertyChanges({});setFieldEdits([]);setTaxOverrides({});setSavedInfo(null);setSavedSnapshot(null);setLegacyMatches({});setLegacyFetchedAt('');setLegacyMessage('Importe um arquivo para consultar os atos do cartório selecionado.');setSelected(null);setMinuteIndex(null);setPendingIndex(null);setError('');
 }
 function savePreparation() {
  const preparation:Preparation={kind:'itn003-preparation',version:1,registry:registry||undefined,name:auditName.trim()||file,file,raw,classifications,taxOverrides,propertyChanges,fieldEdits,decisions,reasons};
  download(new Blob([JSON.stringify(preparation,null,2)],{type:'application/json'}),file.replace(/\.json$/i,'')+'-preparacao.json');
 }
 async function upload(input:File|undefined) {
  if(!input)return;
  if(!registry){setError('Selecione o cartório antes de importar o arquivo.');return;}
  if(dirty&&!await persistProgress())return;
  setError('');setBusy(true);
  try {
   if(input.size>100*1024*1024)throw new Error('O limite de carregamento é 100 MB; o JSON original deve ter até 45 MB.');
   const content=await input.text();
   let draft:Preparation|undefined;
   try {const value=JSON.parse(content.replace(/^\uFEFF/,''));if(value?.kind==='itn003-preparation')draft=readPreparation(value);}catch(error){if(error instanceof SyntaxError)throw new Error('Arquivo JSON inválido.');throw error;}
   if(draft?.registry&&draft.registry!==registry)throw new Error(`Esta preparação pertence ao ${registryLabels[draft.registry]}. Selecione esse cartório antes de importá-la.`);
   const source=draft?.raw??content;
   if(new Blob([source]).size>45*1024*1024)throw new Error('O JSON original deve ter até 45 MB.');
   const audit=await (await request('audit',{raw:source,classifications:draft?.classifications,taxOverrides:draft?.taxOverrides,propertyChanges:draft?.propertyChanges,fieldEdits:draft?.fieldEdits})).json();
   setLegacyMatches({});setLegacyFetchedAt('');setLegacyMessage('Arquivo carregado. Clique em “Consultar atos do JSON” para consultar o legado.');setSavedInfo(null);setSavedSnapshot(null);setTaxOverrides(draft?.taxOverrides??{});setClassifications(draft?.classifications??{});setPropertyChanges(draft?.propertyChanges??{});setFieldEdits(draft?.fieldEdits??[]);setRaw(source);setFile(draft?.file??input.name);setAuditName(draft?.name||draft?.file||input.name.replace(/\.json$/i,''));setResult(audit);setDecisions(draft?.decisions??{});setReasons(draft?.reasons??{});setPendingIndex(null);setMinuteIndex(null);setSelected(null);setPage(0);setQuery('');setFilter('all');setGeoFilter('all');setView('pending');
  }
  catch(e){setError(e instanceof Error?e.message:'Falha ao importar arquivo.');} finally{setBusy(false);}
 }
 async function exportJson() {
  setBusy(true);setError('');try {const response=await request('export',{raw,classifications,taxOverrides,propertyChanges,fieldEdits,excluded:excludedIndices(indices,decisions)});download(await response.blob(),file.replace(/\.json$/i,'')+'-final.json');}catch(e){setError(e instanceof Error?e.message:'Falha ao exportar.');}finally{setBusy(false);}
 }
 return <><aside className="rail"><div className="brand">i<span>tn</span></div><div className="rail-label">003</div><div className="rail-active">▤</div><span className="rail-bottom">ONR</span></aside><main><header><div><span className="eyebrow">CONTROLE DE REMESSAS / ITN003</span><h1>Auditoria de imóveis</h1><p>Revise os dados. Decida o que enviar. Preserve o arquivo original.</p></div><div className="header-actions"><button onClick={()=>setShowFieldGuide(true)}>Consultar campos ITN003</button><span className="local">● Ambiente local</span><details ref={toolsMenu} className="audit-tools"><summary aria-label="Ferramentas: auditorias salvas e conexão" title="Auditorias salvas e conexão">Ferramentas <span aria-hidden="true">⋯</span></summary><div className="audit-tools-panel"><button disabled={listBusy||busy||saving||legacyBusy} onClick={()=>void listPreparations()}>Auditorias salvas</button><div className="audit-tools-divider"/><strong>Legado{registry?` — ${registryLabels[registry]}`:''}</strong><button disabled={!registry||legacyBusy||busy||saving} onClick={()=>void checkLegacy()}>{legacyBusy?'Consultando…':'Verificar conexão'}</button>{result&&<button disabled={!registry||legacyBusy||busy||saving} onClick={()=>void loadLegacyContext()}>Consultar atos do JSON</button>}<p role="status">{registry?legacyMessage:'Selecione um cartório para consultar o legado.'}</p><small>Consulta somente de leitura</small></div></details></div></header>{showFieldGuide&&<FieldGuide onClose={()=>setShowFieldGuide(false)}/>}
 <section className="registry-selection"><label>Cartório<select aria-label="Cartório" value={registry} disabled={busy||saving||legacyBusy} onChange={event=>void changeRegistry(event.target.value)}><option value="">Selecione o cartório</option>{Object.entries(registryLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><p>{result?'Ao trocar de cartório, o andamento será salvo e a tela ficará pronta para outro arquivo.':'Selecione o cartório antes de importar o arquivo ou consultar o legado.'}</p></section>
 <section className="intro"><div><span className="eyebrow">01 — ARQUIVO DE ORIGEM</span><h2>{file||'Comece pelo seu arquivo JSON'}</h2><p>{result?`${result.items.length} imóveis carregados · schema ${result.schemaVersion}`:'Importe o arquivo para identificar divergências e organizar sua revisão.'}</p></div><label className="button primary">{busy?'Processando…':result?'Abrir outro arquivo':'↑ Importar JSON ou preparação'}<input aria-label="Importar arquivo JSON" type="file" accept=".json,application/json" disabled={!registry||busy||legacyBusy||saving} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label></section>
 {result&&<section className="audit-name"><label>Nome da auditoria<input aria-label="Nome da auditoria" maxLength={160} placeholder="Ex.: Março/2026 — imóveis rurais" value={auditName} onChange={event=>setAuditName(event.target.value)}/></label><small>Ao importar outro arquivo, uma nova auditoria é criada. Cada uma guarda seu próprio andamento.</small></section>}
 {result&&<section className="save-progress compact-save"><div><strong>{saving?'Salvando andamento…':dirty?'Alterações ainda não salvas':'Andamento salvo'}</strong>{savedInfo&&<small>Último salvamento: {new Date(savedInfo.updatedAt).toLocaleString('pt-BR')}</small>}</div><button disabled={saving||busy||!dirty} onClick={()=>void persistProgress()}>{saving?'Salvando…':'Salvar andamento'}</button></section>}
 {showSaved&&<SavedAuditsDialog onClose={()=>setShowSaved(false)}>{error&&<div role="alert" className="error">{error}</div>}<section className="saved-audits">{listBusy&&<p role="status" className="empty">Carregando auditorias…</p>}{!savedList.length&&!listBusy&&<p className="empty">Nenhuma auditoria salva ainda.</p>}{savedList.map(item=><article key={item.id}><div><strong>{item.name||item.file}</strong><small>{item.registry?registryLabels[item.registry]:'Cartório ainda não definido'}</small><small className="source-filename">Arquivo: {item.file}</small><p>{item.pending} a revisar · {item.kept} mantidos · {item.excluded} excluídos</p><small>Salvo em {new Date(item.updatedAt).toLocaleString('pt-BR')}</small></div><button disabled={busy||saving||legacyBusy} onClick={()=>void reopenSaved(item.id)}>Continuar revisão</button></article>)}</section></SavedAuditsDialog>}
 {error&&!showSaved&&<div role="alert" className="error">{error}</div>}
 <div className="notice"><strong>A decisão de envio é sua.</strong> O schema verifica a estrutura. O enquadramento do ato exige revisão. Para acervo, considere a flexibilização prevista no art. 3º-A, §3º da documentação fornecida.</div>
 {result?<><section className="stats">{[['Atos no arquivo',result.items.length],['A revisar',counts.pending],['Excluídos da remessa',counts.excluded],['Mantidos para o JSON final',counts.kept]].map(([label,n])=><div key={label}><span>{label}</span><strong>{n}</strong></div>)}</section>
 {!!result.rootIssues.length&&<section className="root-errors"><strong>Pendências no cabeçalho do arquivo</strong>{result.rootIssues.map((e,i)=><div key={i}><p>{e.path}: {e.message}</p>{e.path!=='/imoveis'&&<PendingFieldEditor issue={e} data={undefined} disabled={busy||saving} onApply={(path,value)=>applyFieldEdit(undefined,path,value)}/>}</div>)}<small>Excluir imóveis não corrige essas pendências.</small></section>}
 <section className="workspace"><div className="listing"><div className="section-head"><div><span className="eyebrow">02 — REVISÃO DOS REGISTROS</span><h2>Preparação da remessa</h2></div><span>{filtered.length} resultados</span></div><nav className="review-tabs" aria-label="Etapas da revisão">{[['pending','A revisar',counts.pending],['kept','Mantidos',counts.kept],['excluded','Excluídos',counts.excluded],['all','Todos',result.items.length]].map(([key,label,count])=><button key={key} className={view===key?'active':''} aria-pressed={view===key} onClick={()=>{setView(String(key));setPage(0);}}>{label} <span>{count}</span></button>)}</nav><div className="filters"><input aria-label="Buscar imóveis" placeholder="Buscar matrícula, transcrição, ato ou data…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><select aria-label="Filtrar situação" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="all">Todas as situações</option><option value="valid">Schema válido</option><option value="invalid">Erro de estrutura</option><option value="review">Revisar acervo</option></select><select aria-label="Filtrar georreferenciamento" value={geoFilter} onChange={event=>{setGeoFilter(event.target.value);setPage(0);}}><option value="all">Georreferenciamento: todos</option><option value="yes">Com georreferenciamento</option><option value="no">Sem georreferenciamento</option><option value="missing">Não informado</option><option value="invalid">Valor inválido</option></select></div>
 <div className="table-wrap"><table><thead><tr><th>Decisão</th><th>Identificação</th><th>Ato</th><th>Data do ato</th><th>Georreferenciamento</th><th>Tipo / motivo</th><th>Situação</th><th></th></tr></thead><tbody>{filtered.slice(page*50,page*50+50).map(i=><tr key={i.index} className={excluded.has(i.index)?'excluded':selected===i.index?'selected':''}><td><span className={`badge ${decisions[i.index]==='keep'?'valid':decisions[i.index]==='exclude'?'excluded-status':'review'}`}>{decisions[i.index]==='keep'?'Mantido':decisions[i.index]==='exclude'?'Excluído':'A revisar'}</span></td><td className="compact-reference"><strong>{compactActReference(i.data)}</strong><small>{recordIdentity(i).type}{compactActReference(i.data)==='M-0'?` ${recordIdentity(i).number}`:''}</small></td><td className="act-cell"><button className="act-name-button" aria-label={`Ver minuta de ${i.actType} ${i.actNumber}, ${recordIdentity(i).type} ${recordIdentity(i).number}`} onClick={()=>setMinuteIndex(i.index)}><span className="act-classification act-description">{i.act}</span>{classifications[i.index]!==undefined&&<span className="badge review">Classificação alterada</span>}{legacyDescription(legacyMatches[i.index])&&<span className="legacy-description">{legacyDescription(legacyMatches[i.index])} · legado</span>}<span className="minute-link">Ver minuta ↗</span></button>{isOtherAct(i.data)&&!legacyDescription(legacyMatches[i.index])&&<small className="missing-description">Descrição não fornecida no JSON</small>}</td><td className="act-date">{i.actDate || "Não informada"}</td><td><span className={`badge ${geographicDetails(i.data).status==='yes'?'valid':geographicDetails(i.data).status==='no'?'neutral':'review'}`}>{geographicDetails(i.data).label}</span></td><td>{i.type}<small>{i.reason}</small></td><td><span className={`badge ${i.status}`}>{titles[i.status]}</span><div>{i.issues.length?<button className="pending-link" aria-label={`Ver ${i.issues.length} pendências de ${i.actType} ${i.actNumber}, ${recordIdentity(i).type} ${recordIdentity(i).number}`} onClick={()=>setPendingIndex(i.index)}>{i.issues.length} pendência(s) ↗</button>:<small>Sem pendências</small>}</div></td><td><div className="row-actions"><button className="text" onClick={()=>setSelected(i.index)}>Revisar ↗</button>{!decisions[i.index]?<><button className="text" onClick={()=>decide(i.index,'keep')}>Manter</button><button className="text remove-action" onClick={()=>decide(i.index,'exclude')}>Excluir</button></>:<button className="text" onClick={()=>reopen(i.index)}>Voltar à fila</button>}</div></td></tr>)}</tbody></table>{!filtered.length&&<p className="empty">{view==='pending'&&counts.pending===0?(counts.kept?'Fila concluída. Confira os mantidos e gere o JSON final.':'Todos os atos foram excluídos. Consulte a aba Excluídos para reconsiderar uma decisão.'):'Nenhum ato encontrado com esses filtros.'}</p>}</div><div className="pagination"><button disabled={page===0} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,Math.ceil(filtered.length/50))}</span><button disabled={(page+1)*50>=filtered.length} onClick={()=>setPage(page+1)}>Próxima</button></div></div>
 </section>
 {pendingItem&&<PendingModal item={pendingItem} onClose={()=>setPendingIndex(null)} onReview={()=>{setPendingIndex(null);setSelected(pendingItem.index);}}/>}
 {minuteItem&&<MinuteModal registry={registry as Registry} taxOverride={taxOverrides[minuteItem.index]} onTaxChange={value=>applyTax(minuteItem.index,value)} key={minuteItem.index} classification={Number((minuteItem.data as Record<string,unknown>)?.ato)||0} originalClassification={minuteItem.originalAct} classificationChanged={classifications[minuteItem.index]!==undefined} editing={busy} saving={saving} issues={minuteItem.issues} decision={decisions[minuteItem.index]} onDecide={decision=>{decide(minuteItem.index,decision);setMinuteIndex(null);}} onReturnToQueue={()=>{reopen(minuteItem.index);setMinuteIndex(null);}} onClassify={code=>reclassify(minuteItem.index,code)} propertyChanged={propertyChanges[minuteItem.index]!==undefined} onPropertyChange={code=>applyPropertyChange(minuteItem.index,code)} onSave={()=>void persistProgress()} data={minuteItem.data} identity={`${recordIdentity(minuteItem).type} ${recordIdentity(minuteItem).number}`} actLabel={`${minuteItem.actType} ${minuteItem.actNumber} · ${minuteItem.actDate||'Data não informada'}`} initialMatch={legacyMatches[minuteItem.index]} onResolved={(match,fetchedAt)=>{setLegacyMatches(previous=>({...previous,[minuteItem.index]:{...match,index:minuteItem.index}}));setLegacyFetchedAt(fetchedAt);}} onClose={()=>setMinuteIndex(null)}/>}
 {active&&<ReviewModal registry={registry as Registry} taxOverride={taxOverrides[active.index]} onTaxChange={value=>applyTax(active.index,value)} active={active} legacy={legacyMatches[active.index]} decision={decisions[active.index]} reason={reasons[active.index]??''} onReason={reason=>setReasons(previous=>({...previous,[active.index]:reason}))} onDecide={decision=>decide(active.index,decision)} onSave={()=>void persistProgress()} saving={saving} editing={busy} classificationChanged={classifications[active.index]!==undefined} onClassify={code=>reclassify(active.index,code)} propertyChanged={propertyChanges[active.index]!==undefined} onPropertyChange={code=>applyPropertyChange(active.index,code)} onFieldEdit={(path,value)=>applyFieldEdit(active.index,path,value)} onClose={()=>setSelected(null)}/>}

 <footer><div><strong>{counts.pending?`${counts.pending} ato(s) ainda a revisar`:'Revisão concluída'}</strong><p>{counts.kept} mantidos · {counts.excluded} excluídos · {result.items.filter(i=>decisions[i.index]==='keep'&&i.status!=='valid').length} mantidos com pendências</p><small>{counts.pending?'Decida manter ou excluir cada ato antes de gerar o JSON final.':'O JSON final contém somente os atos mantidos, inclusive aqueles com pendências.'}</small></div><div className="actions"><button disabled={saving||busy||!dirty} onClick={()=>void persistProgress()}>{saving?'Salvando…':'Salvar andamento'}</button><button onClick={savePreparation}>Baixar preparação</button><button onClick={()=>download(new Blob([JSON.stringify({cartorio:registry,auditoria:auditName.trim()||file,arquivo:file,legado_consultado_em:legacyFetchedAt||undefined,data:new Date().toISOString(),rootIssues:result.rootIssues,decisoes:result.items.map(i=>({index:i.index,tipo_registro:recordIdentity(i).type,identificacao:recordIdentity(i).number,ato:i.act,codigo_ato_original:i.originalAct,codigo_ato_final:(i.data as Record<string,unknown>)?.ato,classificacao_alterada:classifications[i.index]!==undefined,alteracao_valor_imposto:taxOverrides[i.index],alteracao_imovel:propertyChanges[i.index],numero_ato:i.actNumber,data_ato:i.actDate,dados_legado:legacyMatches[i.index],georreferenciamento:geographicDetails(i.data).label,descricao_outro:isOtherAct(i.data)?'Não fornecida no JSON':undefined,status:i.status,decisao:decisions[i.index]??'pending',enviar:decisions[i.index]==='keep',motivo:reasons[i.index]??'',divergencias:i.issues,observacoes_documentacao:i.documentationNotes??[],erros_completos:i.rawIssues}))},null,2)],{type:'application/json'}),'relatorio-auditoria.json')}>Baixar relatório</button><button className="primary" disabled={busy||counts.pending>0||counts.kept===0} onClick={()=>void exportJson()}>↓ Gerar JSON final</button></div></footer></>:<section className="welcome"><span className="eyebrow">UM FLUXO SIMPLES, DO INÍCIO AO FIM</span><div>{[['01','Importe','Carregue o JSON recebido da serventia.'],['02','Audite','Veja erros de estrutura e revise cada registro.'],['03','Decida','Mantenha ou exclua cada ato e esvazie a fila.'],['04','Exporte','Baixe o JSON com os registros mantidos.']].map(([n,title,description])=><article key={n}><span>{n}</span><h2>{title}</h2><p>{description}</p></article>)}</div><p>Os dados são processados em memória no servidor local. Nenhum arquivo é enviado ao ONR. Use “Salvar andamento” e depois “Auditorias salvas” para continuar de onde parou. O JSON final só é gerado ao concluir a fila.</p></section>}
 <div className="footnote">ITN003 · Documentação local · Layout ONR 1.3.0 · Revisão assistida</div></main></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
