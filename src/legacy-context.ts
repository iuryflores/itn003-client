export type LegacyAct={id:string;title:string|null;service:string|null;actKind:string;registeredAt:string|null;sealedAt:string|null;classification:string|null;georeferencing:boolean|null;polygon:string|null;cancelled:boolean;matchKind:string};
export type LegacyMatch={index:number;status:'matched'|'ambiguous'|'not_found'|'invalid_key';message:string;record?:LegacyAct};
export function legacyDescription(match:LegacyMatch|undefined) {
 if(match?.status!=='matched')return null;
 return match.record?.title?.trim()||match.record?.service?.trim()||null;
}
