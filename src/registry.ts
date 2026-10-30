export type Registry='1RIGO'|'2RIGO';
export function isRegistry(value:unknown):value is Registry{return value==='1RIGO'||value==='2RIGO';}
