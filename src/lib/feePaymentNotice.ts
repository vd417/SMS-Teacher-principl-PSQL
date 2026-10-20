/** Parent fee-receipt alerts are not for teachers. The API stores them school-wide when the guardian has no login. */
export function isParentFeePaymentNotice(note: { title: string; body: string }): boolean {
  const title = note.title.trim().toLowerCase();
  const body = note.body.trim().toLowerCase();
  return title.includes('invoice paid') || body.includes('has been paid successfully');
}
