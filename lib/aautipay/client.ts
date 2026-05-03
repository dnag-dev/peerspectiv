/**
 * Aautipay API client.
 *
 * Reference doc: Integration_with_AautiPay (received 2026-04-26).
 *
 * Base URLs:
 *   dev   → https://apidev.aautipay.com
 *   qa    → https://apiqa.aautipay.com
 *   demo  → https://apidemo.aautipay.com
 *   prod  → https://api.aautipay.com
 *
 * Auth: POST /plugin/login → auth_token. Subsequent calls use
 * Authorization: Bearer <token>.
 *
 * NOTE: This client is real per the spec. Live calls require AAUTIPAY_*
 * env vars; absent those, calls will throw at login time. Callers should
 * try/catch and fall back gracefully (e.g., still mark internal records
 * approved, log the failure to aautipay_events).
 */

const ENV_TO_BASE: Record<string, string> = {
  dev: 'https://apidev.aautipay.com',
  qa: 'https://apiqa.aautipay.com',
  demo: 'https://apidemo.aautipay.com',
  prod: 'https://api.aautipay.com',
};

const ENV = process.env.AAUTIPAY_ENV ?? 'dev';
const BASE = ENV_TO_BASE[ENV] ?? ENV_TO_BASE.dev;
const APP_TOKEN = process.env.AAUTIPAY_APP_TOKEN ?? '';
const EMAIL = process.env.AAUTIPAY_EMAIL ?? '';
const PASSWORD = process.env.AAUTIPAY_PASSWORD ?? '';
const MODE = (process.env.AAUTIPAY_MODE ?? 'test') as 'test' | 'live';

interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

async function login(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  if (!EMAIL || !PASSWORD) {
    throw new Error('Aautipay credentials missing (AAUTIPAY_EMAIL / AAUTIPAY_PASSWORD)');
  }
  const res = await fetch(`${BASE}/plugin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Aautipay login failed: ${res.status}`);
  const json = (await res.json()) as { status?: boolean; data?: { auth_token?: string } };
  if (!json?.status || !json?.data?.auth_token) {
    throw new Error('Aautipay login returned unexpected payload');
  }
  cachedToken = {
    token: json.data.auth_token,
    expiresAt: Date.now() + 50 * 60 * 1000, // assume 1h tokens; refresh at 50m
  };
  return cachedToken.token;
}

async function authFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await login();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Aautipay ${path} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type AautipayEventType =
  | 'pay-in'
  | 'payout'
  | 'beneficiary'
  | 'bank_account'
  | 'refund'
  | 'company_representative';

export interface AautipayWebhookPayload {
  event: AautipayEventType;
  // Pay-in
  order_code?: string;
  transaction_code?: string;
  // Payout
  payout_id?: string;
  customer_payout_id?: string;
  // Beneficiary / bank_account / company_representative
  account_id?: string;
  customer_id?: string;
  beneficiary_id?: string;
  beneficiary_bank_account_id?: string;
  customer_bank_account_id?: string;
  // Refund
  refund_id?: string;
  customer_refund_id?: string;
}

export interface PayInResponse {
  status: boolean;
  data: {
    mode: string;
    gateway: string;
    country_code: string;
    order_code: string;
    transaction_code: string;
    currency: string;
    amount: number;
    email: string;
    name: string;
    mobile: string;
    payment_method: string;
    charged_amount: number;
    is_subscription: boolean;
    subscription_id: string | null;
    subscription_start_date: string | null;
    subscription_end_date: string | null;
    fail_reason: string;
    status: string;
    payment_id: string;
    short_url?: string | null;
    next_date?: string | null;
  };
}

export interface PayoutResponse {
  status: boolean;
  data: {
    payout_id: string;
    customer_payout_id: string;
    amount: number;
    status: string;
    fail_reason: string;
    beneficiary_id: string;
    destination_id: string;
    name: string;
    email: string;
    country_code: string;
    scheduled_on: string;
    approved_on: string;
    createdAt: string;
  };
}

export interface BeneficiaryResponse {
  status: boolean;
  data: {
    beneficiary_id: string;
    business_type: string;
    pending_requirements: string[];
    account_id: string;
    fail_reason: string | null;
    currency: string;
    gateway: string;
    status: string;
    country_code: string;
    name: string;
    email: string;
    customer_id: string;
  };
}

export interface CreateCustomerInput {
  country_code: string;
  currency: string;
  business_type: 'individual' | 'company' | 'non_profit';
  personal_info: Array<{
    customer_id: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    mobile_code: string;
    ip_address?: string;
    DOB?: string;
    ssn_last_4?: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    identity_documents?: { front?: string; back?: string };
    role?:
      | 'authorizer'
      | 'director'
      | 'executive'
      | 'legal_guardian'
      | 'owner'
      | 'representative';
    percent_share?: number;
    position?: string;
  }>;
  bank_info: {
    bank_name: string;
    customer_bank_id: string;
    name: string;
    account_number: string;
    bank_code: string;
    primary?: boolean;
    documents?: string[];
  };
  business_info?: {
    name: string;
    tax_id: string;
    url?: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    email: string;
    customer_id: string;
    mobile: string;
    mobile_code: string;
  };
}

export interface CreatePayoutInput {
  customer_payout_id: string;
  amount: number;
  payout_reason: string;
  beneficiary_id: string;
  destination_id: string;
  country_code: string;
  currency: string;
  payout_data?: Array<{
    item: string;
    description: string;
    quantity: number;
    price: number;
  }>;
}

export interface CreatePaymentLinkInput {
  name: string;
  amount: number;
  mobile: string;
  email: string;
  country_code: string;
  address?: string;
  currency: string;
  transaction_code: string;
  payThroughRecurrence?: boolean;
  recurrenceObj?: {
    intervalType: 'weekly' | 'monthly' | 'yearly';
    interval_count: number;
    maxRecurrenceAmount?: number;
  };
  saveCard?: boolean;
  order_details?: Record<string, unknown>;
  expiresAt?: string;
}

// ─── Public methods ─────────────────────────────────────────────────────────

export const aautipay = {
  async getPayInStatus(orderCode: string): Promise<PayInResponse> {
    return authFetch<PayInResponse>(`/plugin/pay-response/pay-in/${orderCode}`);
  },

  async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
    return authFetch<PayoutResponse>(`/plugin/pay-response/payout/${payoutId}`);
  },

  async getBeneficiaryStatus(accountId: string): Promise<BeneficiaryResponse> {
    return authFetch<BeneficiaryResponse>(`/plugin/pay-response/beneficiary/${accountId}`);
  },

  async getBankAccountStatus(bankAccountId: string) {
    return authFetch(`/plugin/pay-response/bank_account/${bankAccountId}`);
  },

  async getRefundStatus(refundId: string) {
    return authFetch(`/plugin/pay-response/refund/${refundId}`);
  },

  /**
   * Create a hosted payment link (used for client invoice payment).
   * Returns { status, payment_link } per spec.
   */
  async createPaymentLink(
    input: CreatePaymentLinkInput
  ): Promise<{ status: boolean; payment_link: string }> {
    return authFetch(`/plugin/create-payment-link`, {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        app_token: APP_TOKEN,
        mode: MODE,
      }),
    });
  },

  /**
   * Create beneficiary (peer KYC + bank). Used during peer onboarding.
   */
  async createCustomer(input: CreateCustomerInput) {
    return authFetch(`/plugin/create-customer`, {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        app_token: APP_TOKEN,
        mode: MODE,
      }),
    });
  },

  /**
   * Initiate a payout. Requires verified KYC + bank.
   */
  async createPayoutApproval(input: CreatePayoutInput) {
    return authFetch(`/plugin/payout-approvals`, {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        app_token: APP_TOKEN,
      }),
    });
  },

  async cancelPayout(payoutId: string) {
    return authFetch(`/cancel-payout/${payoutId}`, { method: 'PUT' });
  },

  async cancelSubscription(orderCode: string) {
    return authFetch(`/plugin/cancel-subscription-payment`, {
      method: 'POST',
      body: JSON.stringify({ order_code: orderCode }),
    });
  },

  async pauseSubscription(orderCode: string) {
    return authFetch(`/plugin/pause-subscription-payment`, {
      method: 'POST',
      body: JSON.stringify({ order_code: orderCode }),
    });
  },

  async getSubscriptionCapabilities(gateway: 'cashfree' | 'razorpay' | 'stripe') {
    return authFetch(`/plugin/get-subscription-capabilities/${gateway}`);
  },

  async refundWithApproval(input: {
    transaction_id: string;
    order_code: string;
    customer_refund_id: string;
    refund_method: 'source' | 'bank';
    refund_amount: number;
    refund_reason: string;
    refund_type: 'partial' | 'full';
    refund_data?: Array<{
      item: string;
      description: string;
      quantity: number;
      price: number;
    }>;
  }) {
    return authFetch(`/plugin/refund-approvals`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Public config for the client-side web SDK loader.
   * (Safe to expose: env name, mode, app token, script URL.)
   */
  getPublicConfig() {
    const scriptUrl =
      ({
        dev: 'https://dev.aautipay.com/plugin/main.js',
        qa: 'https://qa.aautipay.com/plugin/main.js',
        demo: 'https://demo.aautipay.com/plugin/main.js',
        prod: 'https://www.aautipay.com/plugin/main.js',
      } as Record<string, string>)[ENV] ?? 'https://dev.aautipay.com/plugin/main.js';
    return { env: ENV, mode: MODE, appToken: APP_TOKEN, scriptUrl };
  },
};
