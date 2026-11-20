import {clearMemberSession} from '../../../../lib/member-auth';
export const runtime='nodejs';
export async function POST(){await clearMemberSession();return Response.json({ok:true})}
