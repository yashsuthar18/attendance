import { adminDb } from '../../../../lib/db';
import { mobileNumber, secret } from '../../../../lib/security';
import { hash } from 'bcryptjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/organizer/setup-password
// Body: { setupKey, mobile, password, displayName }
// setupKey must match ORGANIZER_SETUP_KEY env variable
// Use this ONCE to set organizer mobile + password, then disable or protect this route.
export async function POST(req) {
  try {
    const body = await req.json();
    const setupKey = process.env.ORGANIZER_SETUP_KEY;
    if (!setupKey || body.setupKey !== setupKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const mobile = mobileNumber(body.mobile);
    if (!mobile) return Response.json({ error: 'Invalid mobile number' }, { status: 400 });
    const password = typeof body.password === 'string' ? body.password.trim() : '';
    if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });

    const passwordHash = await hash(password, 12);
    const db = adminDb();

    // Update the existing organizer row (must already exist in organizers table)
    const { data, error } = await db
      .from('organizers')
      .update({
        mobile,
        password_hash: passwordHash,
        display_name: body.displayName || 'Organizer',
      })
      .eq('mobile', mobile)
      .select('id, mobile, display_name')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return Response.json(
        { error: 'No organizer found with that mobile. First add mobile column via SQL migration and set mobile in Supabase Table Editor.' },
        { status: 404 }
      );
    }

    return Response.json({ ok: true, mobile: data.mobile, display_name: data.display_name });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
