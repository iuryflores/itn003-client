import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

type Minute={id:string;title:string|null;text:string|null;tooLarge:boolean;source:string;fetchedAt:string};
const allowedTags=['p','br','div','span','strong','b','em','i','u','s','sub','sup','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code','table','thead','tbody','tfoot','tr','td','th','hr'];
export function MinuteViewer({actId,autoOpen=false}:{actId:string;autoOpen?:boolean}) {
 const [minute,setMinute]=useState<Minute|null>(null);
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>{if(autoOpen)void load();return ()=>controller.current?.abort();},[actId,autoOpen]);
 async function load() {
  setOpen(true);
  if(minute)return;
  controller.current?.abort();
  const abort=new AbortController();controller.current=abort;
  setBusy(true);setError('');
  try {
   const response=await fetch(`/api/legacy/acts/${encodeURIComponent(actId)}/minute`,{signal:abort.signal,cache:'no-store'});
   const value=await response.json();
   if(!response.ok)throw new Error(value.message??'Não foi possível carregar a minuta.');
   if(!abort.signal.aborted)setMinute(value);
  }catch(error){if(!abort.signal.aborted)setError(error instanceof Error?error.message:'Não foi possível carregar a minuta.');}
  finally{if(!abort.signal.aborted)setBusy(false);}
 }
 const html=minute?.text&&/<\/?[a-z][^>]*>/i.test(minute.text)?DOMPurify.sanitize(minute.text,{ALLOWED_TAGS:allowedTags,ALLOWED_ATTR:['colspan','rowspan'],ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false}):null;
 return <section className="minute-viewer"><div className="minute-toolbar"><strong>Minuta / texto do ato</strong><button disabled={busy} onClick={()=>open?setOpen(false):void load()}>{busy?'Carregando…':open?'Ocultar minuta':'Ver minuta do ato'}</button></div>{open&&<><p className="minute-caption">Texto cadastrado no legado · consulta somente de leitura</p>{busy&&<p role="status">Carregando o texto do ato…</p>}{error&&<div role="alert"><p>{error}</p><button onClick={()=>void load()}>Tentar novamente</button></div>}{minute?.tooLarge?<p>O texto excede o limite de visualização de 2 MB. Consulte-o diretamente no sistema legado.</p>:minute&&!minute.text?.trim()?<p>Este ato não possui texto no campo consultado do legado.</p>:minute?.text?<><div className="minute-document" tabIndex={0} aria-label="Texto da minuta">{html!==null?<div dangerouslySetInnerHTML={{__html:html}}/>:<pre>{minute.text}</pre>}</div><small>Fonte: {minute.source}. A minuta não é incluída na preparação, no relatório ou no JSON final.</small></>:null}</>}</section>;
}
