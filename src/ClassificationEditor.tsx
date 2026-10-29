import {useEffect,useState} from 'react';
const options=[
 {value:1,label:'Abertura de matrícula'},
 {value:2,label:'Abertura de matrícula de ofício / decisão judicial'},
 {value:3,label:'Alteração da relação jurídica'},
 {value:4,label:'Transmissão / aquisição originária de direitos reais'},
 {value:5,label:'Alteração do imóvel'},
 {value:6,label:'Outro'},
];
export function ClassificationEditor({current,original,changed,disabled,onApply}:{current:number;original:number|null|undefined;changed:boolean;disabled:boolean;onApply:(code:number|undefined)=>Promise<void>}) {
 const [selected,setSelected]=useState(String(current||''));
 const [error,setError]=useState('');
 useEffect(()=>{setSelected(String(current||''));setError('');},[current]);
 async function apply(value:number|undefined){setError('');try{await onApply(value);}catch(error){setError(error instanceof Error?error.message:'Não foi possível alterar a classificação.');}}
 return <section className="classification-editor"><h3>Classificação do ato</h3><label>Classificação no JSON (campo ato)<select aria-label="Classificação do ato" disabled={disabled} value={selected} onChange={event=>setSelected(event.target.value)}><option value="" disabled>Selecione uma classificação</option>{options.map(option=><option key={option.value} value={option.value}>{option.value} — {option.label}</option>)}</select></label><div className="actions"><button disabled={disabled||!selected||Number(selected)===current} onClick={()=>void apply(Number(selected))}>{disabled?'Revalidando…':'Aplicar classificação'}</button>{changed&&<button disabled={disabled} onClick={()=>void apply(undefined)}>Restaurar original</button>}</div><p>Original: {options.find(option=>option.value===original)?.label??'Não informado ou inválido'}.</p><small>A alteração vale para esta auditoria e para o JSON final. O banco legado não é alterado. As pendências são recalculadas ao aplicar.</small>{error&&<p role="alert" className="classification-error">{error}</p>}</section>;
}
