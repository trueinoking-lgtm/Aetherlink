import { createClient as createServerClient } from '@supabase/supabase-js';
import { DbSchema } from '@aetherlink/core';

// Paynow Node.js SDK types (the package may not have types)
interface PaynowInitResponse {
  success: boolean;
  redirectUrl?: string;
  pollUrl?: string;
  instructions?: string;
  error?: string;
}

interface PaynowStatusResponse {
  status: string;
  amount?: number;
  reference?: string;
  paynowreference?: string;
  pollurl?: string;
  hash?: string;
}

interface Payment {
  add(name: string, price: number): Payment;
}

interface PaynowInstance {
  createPayment(reference: string, email?: string): Payment;
  send(payment: Payment): Promise<PaynowInitResponse>;
  sendMobile(payment: Payment, phone: string, method: string): Promise<PaynowInitResponse>;
  pollTransaction(pollUrl: string): Promise<PaynowStatusResponse>;
}

// Lazy-load paynow to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PaynowClass: any = null;

function getPaynow(): PaynowInstance | null {
  if (!PaynowClass) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const paynowModule = require('paynow');
      PaynowClass = paynowModule.Paynow || paynowModule.default?.Paynow || paynowModule;
    } catch {
      console.error('paynow package not available');
      return null;
    }
  }

  const integrationId = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;

  if (!integrationId || !integrationKey) {
    console.error('Paynow credentials not configured');
    return null;
  }

  const instance = new PaynowClass(integrationId, integrationKey);

  // Set result URL for web-based transactions
  const resultUrl = process.env.PAYNOW_RESULT_URL;
  if (resultUrl && 'resultUrl' in instance) {
    (instance as unknown as { resultUrl: string }).resultUrl = resultUrl;
  }

  return instance;
}

export interface CreatePaymentParams {
  userId: string;
  phone: string;
  amount: number;
  plan: 'pro';
  email?: string;
  method?: 'ecocash' | 'onemoney';
}

export interface PaymentResult {
  success: boolean;
  pollUrl?: string;
  instructions?: string;
  error?: string;
}

/**
 * Initiate a USSD push payment via Paynow
 */
export async function initiatePayment(params: CreatePaymentParams): Promise<PaymentResult> {
  const paynow = getPaynow();
  if (!paynow) {
    return { success: false, error: 'Payment gateway not configured' };
  }

  const { userId, phone, amount, plan, email, method = 'ecocash' } = params;

  // Create unique reference
  const reference = `aether-${userId.slice(0, 8)}-${Date.now()}`;

  // Create payment
  const payment = paynow.createPayment(reference, email || undefined);
  payment.add(`AetherLink ${plan === 'pro' ? 'Pro' : 'Premium'} Plan`, amount);

  try {
    const response = await paynow.sendMobile(payment, phone, method);

    if (response.success) {
      return {
        success: true,
        pollUrl: response.pollUrl,
        instructions: response.instructions || 'Check your phone for a USSD prompt to confirm payment',
      };
    }

    return {
      success: false,
      error: response.error || 'Payment initiation failed',
    };
  } catch (err) {
    console.error('Paynow payment error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown payment error',
    };
  }
}

/**
 * Check payment status via Paynow poll
 */
export async function checkPaymentStatus(pollUrl: string): Promise<{ paid: boolean; status: string }> {
  const paynow = getPaynow();
  if (!paynow) {
    return { paid: false, status: 'error' };
  }

  try {
    const status = await paynow.pollTransaction(pollUrl);
    return {
      paid: status.status?.toLowerCase() === 'paid',
      status: status.status || 'unknown',
    };
  } catch (err) {
    console.error('Paynow poll error:', err);
    return { paid: false, status: 'error' };
  }
}

/**
 * Verify Paynow webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Paynow uses HMAC-SHA256 for webhook verification
  try {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Get Supabase admin client for payment operations
 */
export function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase admin credentials not configured');
  }

  return createServerClient<DbSchema>(url, key);
}
