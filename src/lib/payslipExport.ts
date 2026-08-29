import { Platform } from 'react-native';
import { initialsFrom } from '@/data/http/auth.schema';
import type { PayslipEntry } from '@/data/domain';

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export interface PayslipPdfMeta {
  schoolName: string;
  schoolCity?: string;
  employeeName: string;
  employeeTitle?: string;
  periodLabel: string;
  status?: string;
  logoUrl?: string | null;
  logoInitials?: string;
  brandColor?: string;
  autoPrint?: boolean;
}

function logoMarkup(meta: PayslipPdfMeta, brand: string): string {
  if (meta.logoUrl) {
    return `<div class="logo-shell"><img class="logo" src="${esc(meta.logoUrl)}" alt="${esc(meta.schoolName)} logo" decoding="sync" /></div>`;
  }
  const initials = esc((meta.logoInitials || initialsFrom(meta.schoolName)).slice(0, 3));
  return `<div class="logo-shell badge" style="background:${brand}"><span class="logo-initials">${initials}</span></div>`;
}

/** Printable payslip HTML (print → Save as PDF) with crisp school logo letterhead. */
export function buildPayslipHtml(entry: PayslipEntry, meta: PayslipPdfMeta): string {
  const school = meta.schoolName.trim();
  const employee = meta.employeeName.trim();
  const brand =
    meta.brandColor && /^#?[0-9a-fA-F]{3,8}$/.test(meta.brandColor)
      ? meta.brandColor.startsWith('#')
        ? meta.brandColor
        : `#${meta.brandColor}`
      : '#1A0129';
  const statusLabel = (meta.status ?? entry.status).toUpperCase();
  const earnRow = (label: string, amt: number) =>
    amt > 0
      ? `<div class="row"><span>${esc(label)}</span><strong>${esc(fmt(amt))}</strong></div>`
      : '';
  const dedRow = (label: string, amt: number) =>
    amt > 0
      ? `<div class="row"><span>${esc(label)}</span><strong>− ${esc(fmt(amt))}</strong></div>`
      : '';

  const basic = entry.basic ?? 0;
  const hra = entry.hra ?? 0;
  const allowances = entry.allowances ?? 0;
  const epf = entry.epf ?? 0;
  const profTax = entry.profTax ?? 0;
  const other = entry.otherDeductions ?? 0;
  const hasComponents =
    basic > 0 || hra > 0 || allowances > 0 || epf > 0 || profTax > 0 || other > 0;

  const earnings = hasComponents
    ? `${earnRow('Basic', basic)}${earnRow('HRA', hra)}${earnRow('Allowances', allowances)}`
    : `${earnRow('Basic salary', entry.gross * 0.6)}${earnRow('HRA', entry.gross * 0.2)}${earnRow('Special allowance', entry.gross * 0.1)}`;
  const deductions = hasComponents
    ? `${dedRow('EPF', epf)}${dedRow('Professional tax', profTax)}${dedRow('Other deductions', other)}`
    : `${dedRow('Provident fund', entry.deductions * 0.5)}${dedRow('Tax deduction', entry.deductions * 0.3)}${dedRow('Insurance', entry.deductions * 0.2)}`;

  const autoPrint = meta.autoPrint
    ? '<script>window.addEventListener("load",function(){setTimeout(function(){window.focus();window.print();},300);});</script>'
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Payslip — ${esc(employee)} — ${esc(meta.periodLabel)}</title>
<style>
  *{box-sizing:border-box}
  @page{size:A4;margin:14mm}
  html,body{background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font:13px/1.5 system-ui,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:24px}
  .sheet{max-width:720px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.06)}
  .head{display:flex;align-items:center;gap:16px;padding:22px 24px;border-bottom:3px solid ${brand}}
  .logo-shell{flex:0 0 auto;width:64px;height:64px;border-radius:14px;background:#fff;border:1px solid #e8ecf4;box-shadow:0 2px 10px rgba(15,23,42,.08);padding:8px;display:flex;align-items:center;justify-content:center}
  .logo-shell.badge{border:none;padding:0}
  .logo{width:100%;height:100%;object-fit:contain;object-position:center;display:block}
  .logo-initials{color:#fff;font-weight:800;font-size:22px;letter-spacing:.04em;line-height:1}
  .head .info{flex:1;min-width:0}
  h1{font-size:20px;margin:0 0 2px;line-height:1.2;font-weight:800;color:#0f172a}
  .muted{color:#64748b;font-size:12px}
  .head .doc{text-align:right}
  .doc .ttl{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${brand}}
  .pill{display:inline-block;margin-top:6px;font-size:10px;font-weight:800;color:#fff;background:${brand};border-radius:999px;padding:4px 12px;letter-spacing:.05em}
  .body{padding:20px 24px}
  .emp{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;background:#f8fafc;border:1px solid #eef2f7;border-radius:12px;padding:14px 16px;margin-bottom:16px}
  .emp .row{border:none;padding:3px 0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .box{border:1px solid #e2e8f0;border-radius:12px;padding:14px}
  .box h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin:0 0 8px;font-weight:700}
  .row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #f1f5f9}
  .row:last-child{border-bottom:none}
  .sub{display:flex;justify-content:space-between;font-weight:700;margin-top:8px;padding-top:8px;border-top:2px solid #e2e8f0}
  .net{margin-top:16px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:16px 18px;display:flex;justify-content:space-between;align-items:center}
  .net .amt{font-size:28px;font-weight:800;color:#166534}
  .sign{display:flex;justify-content:space-between;margin-top:36px;gap:24px}
  .sign div{flex:1;border-top:1px solid #cbd5e1;padding-top:6px;text-align:center;color:#64748b;font-size:11px}
  .foot{padding:14px 24px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:11px}
  .toolbar{max-width:720px;margin:0 auto 14px;text-align:right}
  .toolbar button{padding:10px 20px;border-radius:10px;border:none;background:${brand};color:#fff;cursor:pointer;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(15,23,42,.12)}
  @media print{ html,body{background:#fff} body{padding:0} .sheet{border:none;border-radius:0;max-width:none;box-shadow:none} .toolbar{display:none} }
</style></head><body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="sheet">
    <div class="head">
      ${logoMarkup(meta, brand)}
      <div class="info">
        <h1>${esc(school)}</h1>
        ${meta.schoolCity ? `<div class="muted">${esc(meta.schoolCity)}</div>` : ''}
      </div>
      <div class="doc">
        <div class="ttl">Salary Slip</div>
        <div class="muted">${esc(meta.periodLabel)}</div>
        <span class="pill">${esc(statusLabel)}</span>
      </div>
    </div>
    <div class="body">
      <div class="emp">
        <div class="row"><span class="muted">Employee</span><strong>${esc(employee)}</strong></div>
        ${meta.employeeTitle ? `<div class="row"><span class="muted">Designation</span><strong>${esc(meta.employeeTitle)}</strong></div>` : ''}
      </div>
      <div class="grid">
        <div class="box">
          <h2>Earnings</h2>
          ${earnings}
          <div class="sub"><span>Gross</span><span>${esc(fmt(entry.gross))}</span></div>
        </div>
        <div class="box">
          <h2>Deductions</h2>
          ${deductions}
          ${entry.deductions === 0 ? '<div class="row"><span class="muted">No deductions</span><strong>—</strong></div>' : ''}
          <div class="sub"><span>Total deductions</span><span>− ${esc(fmt(entry.deductions))}</span></div>
        </div>
      </div>
      <div class="net">
        <div>
          <div class="muted">Net pay</div>
          <div class="amt">${esc(fmt(entry.net))}</div>
        </div>
        <div class="muted" style="text-align:right;max-width:220px">Gross ${esc(fmt(entry.gross))} − deductions ${esc(fmt(entry.deductions))}</div>
      </div>
      <div class="sign">
        <div>Employee signature</div>
        <div>Authorised signatory</div>
      </div>
    </div>
    <div class="foot">System-generated payslip · ${esc(school)} · ${esc(meta.periodLabel)}. Computer-generated document.</div>
  </div>
  ${autoPrint}
</body></html>`;
}

export function payslipFileName(entry: PayslipEntry, employeeName: string): string {
  const name = employeeName.replace(/\s+/g, '-') || 'Employee';
  return `Payslip-${name}-${entry.month}-${entry.year}.html`;
}

/** Opens print dialog (Save as PDF) on web; no-op on native. */
export function downloadPayslipPdf(entry: PayslipEntry, meta: PayslipPdfMeta): void {
  if (Platform.OS !== 'web') return;

  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(buildPayslipHtml(entry, { ...meta, autoPrint: true }));
    printWin.document.close();
    return;
  }

  const html = buildPayslipHtml(entry, meta);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = payslipFileName(entry, meta.employeeName);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
