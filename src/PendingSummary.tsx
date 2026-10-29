import type {Decision} from './preparation';
type Issue={path:string;rule:string};
export function PendingSummary({issues}:{issues:Issue[]}) {
 const groups=[
  {title:'Campos faltantes',fields:[...new Set(issues.filter(issue=>issue.rule==='required').map(issue=>issue.path))]},
  {title:'Valores ou formatos inválidos',fields:[...new Set(issues.filter(issue=>issue.rule!=='required').map(issue=>issue.path))]},
 ];
 const fieldName=(path:string)=>path==='/'?'Estrutura do ato':path.replace(/^\//,'').replace(/\/(\d+)(?=\/|$)/g,'[$1]').replaceAll('/','.');
 return <section className="minute-pending"><h3>Pendências ({issues.length})</h3>{groups.filter(group=>group.fields.length).map(group=><div className="pending-group" key={group.title}><h4>{group.title}</h4><ul>{group.fields.map(field=><li key={field}><code>{fieldName(field)}</code></li>)}</ul></div>)}{!issues.length&&<p className="success-message">Sem pendências.</p>}</section>;
}
export function decisionLabel(decision:Decision|undefined) {
 return decision==='keep'?'Mantido na remessa':decision==='exclude'?'Excluído da remessa':'A revisar';
}
