export const POS_STEP = 1000;

export function positionForIndex(index: number): number {
  return (index + 1) * POS_STEP;
}
