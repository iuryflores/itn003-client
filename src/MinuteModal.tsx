import type {Registry} from './registry';
import type {TaxOverride} from './tax-overrides';
import {useEffect,useRef,useState} from 'react';
import {MinuteViewer} from './MinuteViewer';
import {ClassificationEditor} from './ClassificationEditor';
import {PendingSummary,decisionLabel} from './PendingSummary';
import {LegacyValuation} from './LegacyValuation';
import type {Decision} from './preparation';
import {legacyDescription} from './legacy-context';
import type {LegacyMatch} from './legacy-context';
import {PropertyChangeEditor} from './PropertyChangeEditor';

type Props={registry:Registry;taxOverride?:TaxOverride;onTaxChange:(value:TaxOverride|undefined)=>Promise<void>;issues:{path:string;rule:string}[];decision:Decision|undefined;onDecide:(decision:Decision)=>void;onReturnToQueue:()=>void;classification:number;originalClassification?:number|null;classificationChanged:boolean;editing:boolean;saving:boolean;onClassify:(code:number|undefined)=>Promise<void>;propertyChanged:boolean;onPropertyChange:(code:number|undefined)=>Promise<void>;onSave:()=>void;data:unknown;identity:string;actLabel:string;initialMatch?:LegacyMatch;onResolved:(match:LegacyMatch,fetchedAt:string)=>void;onClose:()=>void};
export function MinuteModal({registry,taxOverride,onTaxChange,data,identity,actLabel,initialMatch,onResolved,onClose,classification,originalClassification,classificationChanged,editing,saving,issues,decision,onDecide,onReturnToQueue,onClassify,propertyChanged,onPropertyChange,onSave}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const resolved=useRef(onResolved);resolved.current=onResolved;
 const [match,setMatch]=useState<LegacyMatch|undefined>(initialMatch);
 const [busy,setBusy]=useState(!initialMatch);
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const element=dialog.current!;const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';element.showModal();
  return ()=>{element.close();document.body.style.overflow=overflow;};
 },[]);
 useEffect(()=>{
  if(initialMatch){setMatch(initialMatch);setBusy(false);return;}
  const controller=new AbortController();
  setBusy(true);setError('');
  void (async()=>{
   try{
    const response=await fetch('/api/legacy/context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registry,raw:JSON.stringify({imoveis:[data]})}),signal:controller.signal});
    const value=await response.json();
    if(!response.ok)throw new Error(value.message??'Não foi possível localizar o ato.');
    const record=value.matches?.[0] as LegacyMatch|undefined;
    if(!record)throw new Error('O legado não retornou a identificação do ato.');
    if(!controller.signal.aborted){setMatch(record);resolved.current(record,value.fetchedAt);}
   }catch(error){if(!controller.signal.aborted)setError(error instanceof Error?error.message:'Não foi possível consultar o ato.');}
   finally{if(!controller.signal.aborted)setBusy(false);}
  })();
  return ()=>controller.abort();
 },[registry,data,initialMatch,attempt]);
 return <dialog ref={dialog} className="review-modal minute-modal" aria-labelledby="minute-modal-title" onCancel={onClose} onClick={event=>{
  if(event.target!==event.currentTarget)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
 }}><div className="modal-header"><div><span className="eyebrow">MINUTA DO ATO</span><h2 id="minute-modal-title">{identity}</h2><p>{actLabel}</p><span className={`badge ${decision==='keep'?'valid':decision==='exclude'?'excluded-status':'review'}`}>{decisionLabel(decision)}</span>{legacyDescription(match)&&<p className="legacy-description">{legacyDescription(match)}</p>}</div><button className="modal-close" aria-label="Fechar minuta" autoFocus onClick={onClose}>×</button></div><div className="modal-content"><div className="minute-layout"><div className="minute-body">{busy&&<p role="status">Localizando o ato no legado…</p>}{error&&<div role="alert"><p>{error}</p><button onClick={()=>setAttempt(value=>value+1)}>Tentar novamente</button></div>}{!busy&&match&&(match.status==='matched'&&match.record?<>{match.record.cancelled&&<p className="missing-description">Este ato consta como cancelado no legado.</p>}{match.record.matchKind==='opening'&&<p className="notice">{match.message}</p>}<MinuteViewer registry={registry} key={`${registry}:${match.record.id}`} actId={match.record.id} autoOpen/></>:<p role="status">{match.message}</p>)}</div><aside className="minute-editor"><LegacyValuation match={match} taxOverride={taxOverride} currentTax={(data as Record<string,unknown>)?.valor_imposto} disabled={editing||saving||busy} onUse={onTaxChange}/><ClassificationEditor current={classification} original={originalClassification} changed={classificationChanged} disabled={editing||saving||busy} onApply={onClassify}/>{(data as Record<string,unknown>)?.ato===5&&<PropertyChangeEditor current={(data as Record<string,unknown>).alteracao_imovel} changed={propertyChanged} disabled={editing||saving} onApply={onPropertyChange}/>}<div aria-live="polite"><PendingSummary issues={issues}/></div></aside></div></div><div className="modal-footer"><span>Manter ou excluir conclui este ato e o retira da fila de revisão.</span><div className="actions"><button disabled={saving||editing} onClick={onSave}>{saving?'Salvando…':'Salvar andamento'}</button><button disabled={saving||editing} onClick={decision?onReturnToQueue:onClose}>{decision?'Voltar à fila':'Revisar depois'}</button><button className="remove-action" disabled={saving||editing} onClick={()=>onDecide('exclude')}>Excluir da remessa</button><button className="primary" disabled={saving||editing} onClick={()=>onDecide('keep')}>Manter e concluir</button></div></div></dialog>;
}
