export type LegacyAct={valuationValues?:string|null;valuationDto?:string|null;valuationDoi?:string|null;id:string;title:string|null;service:string|null;actKind:string;registeredAt:string|null;sealedAt:string|null;classification:string|null;georeferencing:boolean|null;polygon:string|null;cancelled:boolean;matchKind:string};
export type LegacyMatch={index:number;status:'matched'|'ambiguous'|'not_found'|'invalid_key';message:string;record?:LegacyAct};
export function legacyDescription(match:LegacyMatch|undefined) {
 if(match?.status!=='matched')return null;
 return match.record?.title?.trim()||match.record?.service?.trim()||null;
}

export function valuationEntries(match:LegacyMatch|undefined) {
 if(match?.status!=='matched'||!match.record)return [];
 const candidates=[
  {value:match.record.valuationValues,source:'ato.valores.valorAvaliacao'},
  {value:match.record.valuationDto,source:'ato.dto.valorAvaliacao'},
  {value:match.record.valuationDoi,source:'ato.doi_valor_avaliacao'},
 ];
 return candidates.filter((entry):entry is {value:string;source:string}=>typeof entry.value==='string'&&entry.value.trim().length>0);
}
