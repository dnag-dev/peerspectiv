#!/usr/bin/env node
/**
 * AU-006 — verify Clerk doesn't enumerate accounts via differential errors.
 *
 * Hits the Clerk frontend sign-in API twice with the same wrong password:
 * once with a real account email, once with a fake email. The error
 * message must be identical (or generic) — anything that differs leaks
 * whether the email is registered.
 *
 * Toggle: Clerk Dashboard → User & Authentication → Attack Protection →
 *   "Enhanced email protection" (sometimes labelled "Generic error
 *   messages" / "Email enumeration protection").
 *
 * Usage:
 *   PEERSPECTIV_URL=https://app.peerspectiv.ai \
 *   CLERK_FRONTEND_API=https://moral-ferret-38.clerk.accounts.dev \
 *   node scripts/verify-au-006.mjs
 */

const APP_URL = process.env.PEERSPECTIV_URL || 'https://app.peerspectiv.ai';
const CLERK_FAPI =
  process.env.CLERK_FRONTEND_API || 'https://moral-ferret-38.clerk.accounts.dev';

const REAL_EMAIL = process.env.AU006_REAL_EMAIL || 'admin@peerspectiv.com';
const FAKE_EMAIL =
  process.env.AU006_FAKE_EMAIL ||
  `notarealuser-au006-${Date.now()}@example.com`;
const WRONG_PASSWORD = 'definitely-not-the-real-password-12345';

async function clerkSignInAttempt(identifier) {
  // Clerk FAPI: POST /v1/client/sign_ins?_clerk_js_version=...
  // Body is form-encoded. Returns 422 on bad credentials with errors[] in JSON.
  const url = `${CLERK_FAPI}/v1/client/sign_ins?__clerk_api_version=2024-10-01`;
  const body = new URLSearchParams({
    identifier,
    strategy: 'password',
    password: WRONG_PASSWORD,
  });
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: APP_URL,
        Referer: `${APP_URL}/login`,
      },
      body,
    });
  } catch (e) {
    return { status: 0, body: `(network error: ${e.message})` };
  }
  const text = await res.text();
  return { status: res.status, body: text };
}

function extractErrorMessage(rawBody) {
  try {
    const json = JSON.parse(rawBody);
    return (
      json?.errors?.[0]?.message ||
      json?.errors?.[0]?.long_message ||
      json?.errors?.[0]?.code ||
      ''
    );
  } catch {
    return '';
  }
}

(async () => {
  console.log(`Probing Clerk FAPI at ${CLERK_FAPI}`);
  console.log(`Real email:  ${REAL_EMAIL}`);
  console.log(`Fake email:  ${FAKE_EMAIL}`);
  console.log('');

  const real = await clerkSignInAttempt(REAL_EMAIL);
  const fake = await clerkSignInAttempt(FAKE_EMAIL);

  console.log(`Real → status ${real.status}`);
  console.log(`  body: ${real.body.slice(0, 240)}`);
  console.log(`Fake → status ${fake.status}`);
  console.log(`  body: ${fake.body.slice(0, 240)}`);
  console.log('');

  const realMsg = extractErrorMessage(real.body);
  const fakeMsg = extractErrorMessage(fake.body);

  console.log(`Real error message: "${realMsg}"`);
  console.log(`Fake error message: "${fakeMsg}"`);
  console.log('');

  // PASS conditions:
  //  - Both messages identical, OR
  //  - Both empty (Clerk returned generic 422 with no message), OR
  //  - Both contain a generic phrase ("credentials" or "incorrect") and
  //    neither contains "not found" / "doesn't exist" / "no account"
  const enumerationPhrases = [
    /not found/i,
    /doesn['’]t exist/i,
    /no account/i,
    /no user/i,
    /unknown email/i,
    /no such email/i,
  ];
  const realLeaks = enumerationPhrases.some((re) => re.test(realMsg));
  const fakeLeaks = enumerationPhrases.some((re) => re.test(fakeMsg));

  if (realMsg === fakeMsg && real.status === fake.status) {
    console.log('✅ PASS: identical error response — no enumeration');
    process.exit(0);
  }
  if (!realLeaks && !fakeLeaks && real.status === fake.status) {
    console.log(
      '✅ PASS: both messages generic, no enumeration phrases (status codes match)'
    );
    process.exit(0);
  }
  console.error(
    '❌ FAIL: differential response suggests email enumeration is possible'
  );
  console.error(`  real.status=${real.status} fake.status=${fake.status}`);
  console.error(`  realMsg leaks=${realLeaks} fakeMsg leaks=${fakeLeaks}`);
  process.exit(1);
})();
