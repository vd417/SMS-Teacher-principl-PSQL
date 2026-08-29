/** How many grade cards to show before offering "View more". */
export const COLLAPSED_GRADE_LIMIT = 8;

export function visibleGradeItems<T>(items: T[], expanded: boolean, isSearching: boolean): T[] {
  if (isSearching || expanded || items.length <= COLLAPSED_GRADE_LIMIT) return items;
  return items.slice(0, COLLAPSED_GRADE_LIMIT);
}

export function hiddenGradeCount(
  items: unknown[],
  expanded: boolean,
  isSearching: boolean
): number {
  if (isSearching || expanded) return 0;
  return Math.max(0, items.length - COLLAPSED_GRADE_LIMIT);
}
