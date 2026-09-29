// Regra da plataforma: kit sempre retirado na véspera. events.kit_pickup_instructions só é
// preenchido quando um evento foge da regra; vazio/null = este texto.
export const DEFAULT_KIT_PICKUP_INSTRUCTIONS =
  'A retirada do kit é feita sempre um dia antes do evento, em local e horário informados pela organização.'

export function kitPickupText(instructions: string | null | undefined): string {
  return instructions?.trim() || DEFAULT_KIT_PICKUP_INSTRUCTIONS
}
