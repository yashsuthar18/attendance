import { clearOrganizerSession } from '../../../../lib/organizer-auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST() {
  await clearOrganizerSession();
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
