import { payslipSchema, toPayslip } from '../mappers';

describe('payslipSchema', () => {
  it('maps snake_case payroll payslip wire rows', () => {
    const entry = toPayslip(
      payslipSchema.parse({
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        month: 'August',
        year: 2026,
        gross: 22000,
        deductions: 1020,
        net: 20980,
        status: 'paid',
        basic: 15000,
        hra: 5000,
        allowances: 2000,
        epf: 600,
        prof_tax: 620,
        other_deductions: 0,
      })
    );

    expect(entry.month).toBe('August');
    expect(entry.year).toBe(2026);
    expect(entry.gross).toBe(22000);
    expect(entry.net).toBe(20980);
    expect(entry.basic).toBe(15000);
    expect(entry.profTax).toBe(620);
  });

  it('coerces numeric strings from the API', () => {
    const entry = toPayslip(
      payslipSchema.parse({
        id: 'slip-1',
        month: 'August',
        year: '2026',
        gross: '22000',
        deductions: '1020',
        net: '20980',
        status: 'paid',
      })
    );
    expect(entry.net).toBe(20980);
  });
});
