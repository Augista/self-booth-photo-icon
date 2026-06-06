import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, template, layout } = await request.json();

    if (!sessionId || !template) {
      return NextResponse.json(
        { error: 'sessionId and template required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const updatePayload: Record<string, string> = {
      template,
      status: 'payment_pending',
      updated_at: new Date().toISOString(),
    };

    if (layout) {
      updatePayload.layout = layout;
    }

    const { error } = await supabase
      .from('photobooth_sessions')
      .update(updatePayload)
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, template, layout });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
