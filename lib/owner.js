import { requireOrganizerSession } from './organizer-auth';

// requireOrganizer — now uses cookie-based session (mobile login)
// Also supports legacy Supabase Bearer token for backward compatibility
export async function requireOrganizer(req) {
  return await requireOrganizerSession(req);
}

export async function requireEvent(req, eventId) {
  const ctx = await requireOrganizer(req);
  if (!eventId || typeof eventId !== 'string') throw new Error('Missing event ID');
  const { data: event, error } = await ctx.db
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('organizer_id', ctx.organizerId)
    .maybeSingle();
  if (error || !event) throw new Error('Event not found or no permission');
  return { ...ctx, event };
}

export function apiError(error) {
  const message = String(error?.message || error || 'Unexpected error');
  const status = /login|permission|access not enabled|not found|session|expired/i.test(message) ? 403 : 400;
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
