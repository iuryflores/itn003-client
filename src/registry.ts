export const registryLabels={
 '1RIGO':'1RIGO',
 '2RIGO':'2RIGO',
 SENADOR_CANEDO:'RI Senador Canedo (CNS 02.848-0)',
} as const;
export type Registry=keyof typeof registryLabels;
export function isRegistry(value:unknown):value is Registry{
 return typeof value==='string'&&Object.hasOwn(registryLabels,value);
}
