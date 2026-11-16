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

export const sharedPropertyFields=new Set(['/cod_sncr','/car','/cib']);

export function propertyEditTargets(items:{index:number;data:unknown}[],index:number,path:string) {
 if(!sharedPropertyFields.has(path))return [index];
 const source=record(items.find(item=>item.index===index)?.data);
 const number=matriculaNumber(source);
 if(!number)return [index];
 const matches=items.filter(item=>matriculaNumber(record(item.data))===number);
 const identifiers=new Set(matches.map(item=>cnm(record(item.data))).filter(Boolean));
 if(identifiers.size<=1)return matches.map(item=>item.index);
 const sourceCnm=cnm(source);
 return sourceCnm?matches.filter(item=>cnm(record(item.data))===sourceCnm).map(item=>item.index):[index];
}

function matriculaNumber(source:Record<string,unknown>) {
 const value=source.numero_matricula;
 if(source.tipo_matricula_transcricao!==1||typeof value!=='string'||!/^\d{1,10}$/.test(value.trim()))return '';
 return value.trim().replace(/^0+/,'');
}

function cnm(source:Record<string,unknown>) {
 return typeof source.cnm==='string'?source.cnm.replace(/[.\-\s]/g,''):'';
}
export function compactActReference(data:unknown) {
 const source=record(data);
 const actNumber=typeof source.numero_ato==='string'?source.numero_ato.trim():'';
 if(/^0+$/.test(actNumber))return 'M-0';
 const registryNumber=source.tipo_matricula_transcricao===1?source.numero_matricula:source.tipo_matricula_transcricao===2?source.numero_transcricao:undefined;
 const prefix=source.tipo_ato===2?'AV':source.tipo_ato===1?'R':null;
 if(!prefix||!actNumber||typeof registryNumber!=='string'||!registryNumber.trim())return 'Identificação incompleta';
 return `${prefix}-${actNumber}-${registryNumber}`;
}
