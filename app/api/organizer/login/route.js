import { adminDb } from '../../../../lib/db';
import { hashIp, mobileNumber } from '../../../../lib/security';
import { compare } from 'bcryptjs';
import { setOrganizerSession } from '../../../../lib/organizer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/organizer/login  — mobile + password
export async function POST(req) {
  const fail = () =>
    Response.json({ error: 'Invalid mobile number or password' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  try {
    const body = await req.json();
    const mobile = mobileNumber(body.mobile);
    const password = typeof body.password === 'string' ? body.password.trim() : '';
    if (!mobile || password.length < 6 || password.length > 200) return fail();

    const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0, 100);
    const db = adminDb();
    const ipHash = hashIp(ip);

    // Rate limit
    const { data: allowed, error: limErr } = await db.rpc('reserve_organizer_login_attempt', {
      p_mobile: mobile,
      p_ip_hash: ipHash,
    });
    if (limErr) {
      // Table may not exist yet — skip rate limit gracefully
      console.error('Rate limit RPC error (migration needed?):', limErr.message);
    } else if (!allowed) {
      return Response.json({ error: 'Too many attempts. Try again after 15 minutes.' }, { status: 429 });
    }

    // Lookup organizer by mobile
    const { data: organizer, error: organizerError } = await db
      .from('organizers')
      .select('id, mobile, password_hash, display_name')
      .eq('mobile', mobile)
      .maybeSingle();

    if (organizerError) {
      console.error('Organizer lookup failed:', organizerError.code, organizerError.message);
      return Response.json(
        { error: 'Organizer login is temporarily unavailable. Please ask the administrator to check database setup.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!organizer || !organizer.password_hash) return fail();

    // Verify bcrypt password
    const ok = await compare(password, organizer.password_hash);
    if (!ok) return fail();

    await setOrganizerSession(organizer);
    return Response.json(
      { ok: true, display_name: organizer.display_name || 'Organizer' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('Organizer login error:', e);
    return Response.json({ error: 'Login temporarily unavailable' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
