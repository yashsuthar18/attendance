import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { adminDb } from './db';
import { secret } from './security';

const COOKIE = 'organizer_session';
const key = () => new TextEncoder().encode(secret('MEMBER_SESSION_SECRET'));

export async function setOrganizerSession(organizer) {
  const token = await new SignJWT({ role: 'organizer', mobile: organizer.mobile })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(organizer.id)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60,
  });
}

export async function clearOrganizerSession() {
  (await cookies()).delete(COOKIE);
}

export async function requireOrganizerSession(req) {
  // Support both cookie (browser) and Bearer token (legacy/API calls)
  let token = null;

  // 1. Try cookie first
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)organizer_session=([^;]+)/);
  if (match) token = decodeURIComponent(match[1]);

  // 2. Fallback: Bearer token (Supabase Auth legacy — still works if set)
  if (!token) {
    const bearer = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer) {
      // Legacy Supabase Auth path — verify via Supabase
      const db = adminDb();
      const { data: { user }, error } = await db.auth.getUser(bearer);
      if (error || !user) throw new Error('Invalid organizer login');
      const { data: organizer } = await db.from('organizers').select('id').eq('id', user.id).maybeSingle();
      if (!organizer) throw new Error('Organizer access not enabled');
      return { db, organizerId: user.id };
    }
    throw new Error('Organizer login required');
  }

  // Verify JWT cookie
  let payload;
  try {
    ({ payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] }));
  } catch {
    throw new Error('Organizer session expired — please log in again');
  }

  if (payload.role !== 'organizer' || !payload.sub) throw new Error('Invalid organizer session');

  const db = adminDb();
  const { data: organizer } = await db
    .from('organizers')
    .select('id, mobile, display_name')
    .eq('id', payload.sub)
    .maybeSingle();
  if (!organizer) throw new Error('Organizer not found');

  return { db, organizerId: organizer.id, organizer };
}
