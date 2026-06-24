import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient, verifyWebhookSignature } from '@/lib/payments/paynow';

/**
 * POST /api/webhook/paynow
 * Receives payment confirmations from Paynow
 * Paynow sends POST data with: reference, amount, status, pollid, hash
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.PAYNOW_WEBHOOK_SECRET;
    const signature = req.headers.get('x-paynow-signature') || '';

    if (webhookSecret && signature) {
      const payload = JSON.stringify(body);
      if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
        console.warn('Paynow webhook signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    }

    const { reference, amount, status, pollid } = body;

    if (!reference || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only process paid transactions
    if (status.toLowerCase() !== 'paid') {
      return NextResponse.json({ received: true, status });
    }

    // Extract user ID from reference: "aether-{userId}-{timestamp}"
    const parts = reference.split('-');
    if (parts.length < 3 || parts[0] !== 'aether') {
      return NextResponse.json({ error: 'Invalid reference format' }, { status: 400 });
    }

    const userId = parts[1];

    // Update user's subscription
    const admin = getAdminClient();

    // Calculate subscription end date (30 days from now)
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Direct update using Supabase client (bypassing strict generated types)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (admin as any)
      .from('profiles')
      .update({
        subscription_tier: 'pro',
        subscription_end_date: endDate.toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update profile subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    console.log(`Payment confirmed for user ${userId}: $${amount} via Paynow`);

    return NextResponse.json({ success: true, message: 'Subscription activated' });
  } catch (err) {
    console.error('Paynow webhook error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
