import {useEffect,useState} from 'react';

const changeTypes=[
 'Aluvião','Avulsão','Desdobro','Desmembramento','Divisão','Estremação',
 'Formação de ilha','Loteamento','Regularização fundiária','Retificação','Unificação','Outro',
];

type Props={
 current:unknown;
 changed:boolean;
 disabled:boolean;
 onApply:(code:number|undefined)=>Promise<void>;
};

export function PropertyChangeEditor({current,changed,disabled,onApply}:Props){
 const currentCode=typeof current==='number'&&Number.isInteger(current)&&current>=1&&current<=changeTypes.length?String(current):'';
 const [selected,setSelected]=useState(currentCode);
 const [error,setError]=useState('');
 useEffect(()=>{setSelected(currentCode);setError('');},[currentCode]);

 async function apply(code:number|undefined){
  setError('');
  try{await onApply(code);}
  catch(error){setError(error instanceof Error?error.message:'Não foi possível aplicar o tipo de alteração.');}
 }

 return <section className="classification-editor">
  <label>Tipo de alteração do imóvel
   <select disabled={disabled} value={selected} onChange={event=>setSelected(event.target.value)}>
    <option value="" disabled>Selecione o tipo de alteração</option>
    {changeTypes.map((label,index)=><option key={label} value={index+1}>{index+1} — {label}</option>)}
   </select>
  </label>
  <div className="actions">
   <button disabled={disabled||!selected||selected===currentCode} onClick={()=>void apply(Number(selected))}>Aplicar tipo de alteração</button>
   {changed&&<button disabled={disabled} onClick={()=>void apply(undefined)}>Restaurar tipo original</button>}
  </div>
  {error&&<p role="alert" className="classification-error">{error}</p>}
 </section>;
}
