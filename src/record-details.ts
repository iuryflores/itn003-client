function record(data:unknown):Record<string,unknown> {
 return data!==null&&typeof data==='object'&&!Array.isArray(data)?data as Record<string,unknown>:{};
}
function flag(value:unknown) {
 return value===true?'Sim':value===false?'Não':value===undefined||value===null?'Não informado':'Valor inválido';
}
export function geographicDetails(data:unknown) {
 const source=record(data);
 return {
  status:source.georreferenciamento===true?'yes':source.georreferenciamento===false?'no':source.georreferenciamento==null?'missing':'invalid',
  label:flag(source.georreferenciamento),
  certification:flag(source.certificacao_incra),
  polygon:typeof source.numero_poligono==='number'||typeof source.numero_poligono==='string'?String(source.numero_poligono):'Não informado',
  coordinates:typeof source.coordenadas==='string'&&source.coordenadas.trim()?source.coordenadas:null,
 };
}
export function isOtherAct(data:unknown) { return record(data).ato===6; }
export function compactActReference(data:unknown) {
 const source=record(data);
 const actNumber=typeof source.numero_ato==='string'?source.numero_ato.trim():'';
 if(/^0+$/.test(actNumber))return 'M-0';
 const registryNumber=source.tipo_matricula_transcricao===1?source.numero_matricula:source.tipo_matricula_transcricao===2?source.numero_transcricao:undefined;
 const prefix=source.tipo_ato===2?'AV':source.tipo_ato===1?'R':null;
 if(!prefix||!actNumber||typeof registryNumber!=='string'||!registryNumber.trim())return 'Identificação incompleta';
 return `${prefix}-${actNumber}-${registryNumber}`;
}
