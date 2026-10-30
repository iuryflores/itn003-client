import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
export function SavedAuditsDialog({children,onClose}:{children:ReactNode;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const element=dialog.current!,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';element.showModal();
  return ()=>{element.close();document.body.style.overflow=overflow;};
 },[]);
 return <dialog ref={dialog} className="review-modal saved-audits-modal" aria-labelledby="saved-audits-title" onCancel={onClose} onClick={event=>{
  if(event.target!==event.currentTarget)return;
  const bounds=event.currentTarget.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
 }}><div className="modal-header"><div><span className="eyebrow">CONTINUAR REVISÃO</span><h2 id="saved-audits-title">Auditorias salvas</h2></div><button className="modal-close" aria-label="Fechar auditorias salvas" autoFocus onClick={onClose}>×</button></div><div className="modal-content">{children}</div></dialog>;
}
