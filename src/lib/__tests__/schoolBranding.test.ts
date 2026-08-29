import { logoForTenant } from '@/lib/schoolBranding';

test('logoForTenant returns the logo for the matching school id', () => {
  const schools = [
    { id: 't1', name: 'Alpha School', logoUrl: 'https://cdn.example.com/a.png' },
    { id: 't2', name: 'Beta School', logoUrl: 'https://cdn.example.com/b.png' },
  ];
  expect(logoForTenant('t2', schools)).toBe('https://cdn.example.com/b.png');
});

test('logoForTenant returns null when tenant or schools are missing', () => {
  expect(logoForTenant(undefined, [{ id: 't1', name: 'A', logoUrl: null }])).toBeNull();
  expect(logoForTenant('t1', null)).toBeNull();
  expect(logoForTenant('t3', [{ id: 't1', name: 'A', logoUrl: 'x' }])).toBeNull();
});
