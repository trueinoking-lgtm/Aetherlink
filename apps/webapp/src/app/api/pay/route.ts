import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initiatePayment, checkPaymentStatus } from '@/lib/payments/paynow';

/**
 * POST /api/pay
 * Initiate a USSD push payment
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phone, amount, plan, method } = body;

    if (!phone || !amount || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, amount, plan' },
        { status: 400 }
      );
    }

    // Validate phone format (Zimbabwe)
    const cleanPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (!/^2637[78]\d{7,8}$/.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use format: 2637XXXXXXXX' },
        { status: 400 }
      );
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Validate plan
    const validPlans: Record<string, number> = {
      pro: 9.99,
    };

    const expectedAmount = validPlans[plan];
    if (!expectedAmount) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Allow small tolerance for currency
    if (Math.abs(numAmount - expectedAmount) > 0.01) {
      return NextResponse.json({ error: 'Amount does not match plan' }, { status: 400 });
    }

    // Initiate payment
    const result = await initiatePayment({
      userId: user.id,
      phone: cleanPhone,
      amount: numAmount,
      plan,
      email: user.email,
      method: method || 'ecocash',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Payment failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      instructions: result.instructions,
      pollUrl: result.pollUrl,
    });
  } catch (err) {
    console.error('Payment API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pay?poll=xxx
 * Check payment status
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pollUrl = req.nextUrl.searchParams.get('poll');
    if (!pollUrl) {
      return NextResponse.json({ error: 'Missing poll URL' }, { status: 400 });
    }

    const result = await checkPaymentStatus(pollUrl);

    return NextResponse.json({
      paid: result.paid,
      status: result.status,
    });
  } catch (err) {
    console.error('Payment status check error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
