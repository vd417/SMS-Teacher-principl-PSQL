import { isParentFeePaymentNotice } from '../feePaymentNotice';

test('recognises a parent fee-payment receipt', () => {
  expect(
    isParentFeePaymentNotice({
      title: 'Announcement: Invoice Paid',
      body: 'Invoice for Term 2 for Aarav has been paid successfully. Amount received: 8,500.',
    })
  ).toBe(true);
});

test('leaves homework and attendance alerts visible', () => {
  expect(
    isParentFeePaymentNotice({
      title: 'Homework: Algebra worksheet',
      body: 'Due Friday',
    })
  ).toBe(false);
});
