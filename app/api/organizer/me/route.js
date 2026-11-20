import { requireOrganizerSession } from '../../../../lib/organizer-auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req) {
  try {
    const { organizer, organizerId } = await requireOrganizerSession(req);
    return Response.json(
      { ok: true, organizerId, display_name: organizer?.display_name || 'Organizer' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return Response.json({ error: e.message }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
}
