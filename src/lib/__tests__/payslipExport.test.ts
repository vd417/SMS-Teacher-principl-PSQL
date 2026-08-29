import { buildPayslipHtml } from '../payslipExport';
import type { PayslipEntry } from '@/data/domain';

const entry: PayslipEntry = {
  id: '1',
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
  profTax: 620,
};

describe('buildPayslipHtml', () => {
  it('includes school logo shell and employee breakdown', () => {
    const html = buildPayslipHtml(entry, {
      schoolName: 'Greenwood Valley',
      employeeName: 'Rina Pandey',
      employeeTitle: 'HOD',
      periodLabel: 'August 2026',
      status: 'paid',
      logoUrl: 'https://example.com/logo.png',
      brandColor: '#1A0129',
    });
    expect(html).toContain('logo-shell');
    expect(html).toContain('Rina Pandey');
    expect(html).toContain('Greenwood Valley');
    expect(html).toContain('₹22,000');
    expect(html).toContain('https://example.com/logo.png');
  });
});
