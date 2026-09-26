/** Fails the whole run (non-zero exit, no test executes) when sms-api is unreachable or not ready. */
export default async function globalSetup(): Promise<void> {
  const base = process.env.E2E_API_BASE_URL;
  if (!base) throw new Error('E2E_API_BASE_URL is required, e.g. http://localhost:5162/v1');
  const origin = base.replace(/\/$/, '').replace(/\/v\d+$/, '');
  let status = 0;
  try {
    status = (await fetch(`${origin}/health/ready`)).status;
  } catch (e) {
    throw new Error(
      `sms-api preflight failed: ${origin}/health/ready unreachable (${(e as Error).message})`
    );
  }
  if (status !== 200) throw new Error(`sms-api preflight failed: /health/ready returned ${status}`);
}
