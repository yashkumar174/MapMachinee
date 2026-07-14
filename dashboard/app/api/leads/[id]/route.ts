import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '../../../../lib/prisma';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { apiLimiter, getClientIp } from '../../../../lib/ratelimit';
import { leadUpdateSchema } from '../../../../lib/validation';

async function getAuthContext(request: Request) {
   const cookieHeader = request.headers.get('cookie') || '';
   const fbTokenMatch = cookieHeader.match(/session=([^;]+)/);
   const token = fbTokenMatch ? fbTokenMatch[1] : null;
   
   if (!token) return null;
   
   try {
      const decoded = await adminAuth.verifySessionCookie(token, true);
      const userRecord = await prisma.user.findUnique({
         where: { firebaseUid: decoded.uid }
      });
      return userRecord;
   } catch {
      return null;
   }
}

const VALID_STATUSES = [
  // Legacy & Initial
  'new', 'follow up', 'interested', 'contacted', 'closed',
  // CRM Pipeline — DIGITAL_AGENCY canonical stages
  'New Leads', 'Contacted', 'Follow-Up Needed', 'Meeting Booked',
  'Proposal Sent', 'In Development', 'Completed', 'Lost',
  // Other niche stages still in use
  'In Discussion', 'Client Review', 'Nurturing',
  'Qualified', 'Demo Booked', 'Negotiation',
  'Audit/Mockup Sent', 'Contract Sent',
  'Property Suggested', 'Visit Scheduled', 'Offer Made', 'In Escrow'
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { id } = await params;

    // SECURITY: Input validation via Zod (leadUpdateSchema).
    // .strict() rejects unknown fields — prevents mass-assignment of
    // sensitive columns like organizationId, agent, lastContactedAt, etc.
    const rawBody = await request.json();
    const parsed = leadUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;
    const updateData: any = {};

    // Handle status update
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status: ${body.status}` }, { status: 400 });
      }
      updateData.status = body.status;
    }

    // Handle notes update — saving a note counts as contact, so reset rotting timer
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
      updateData.lastContactedAt = new Date();
    }

    // Handle activity log append
    if (body.activity !== undefined) {
      updateData.activity = body.activity;
    }

    // Handle pipeline toggle
    if (body.inPipeline !== undefined) {
      updateData.inPipeline = Boolean(body.inPipeline);
    }

    // Follow-up scheduling (null clears)
    if (body.nextFollowUp !== undefined) {
      updateData.nextFollowUp = body.nextFollowUp ? new Date(body.nextFollowUp) : null;
    }

    // Forecasting fields
    if (body.dealValue !== undefined) {
      updateData.dealValue = Number(body.dealValue) || 0;
    }
    if (body.probability !== undefined) {
      const p = Math.max(0, Math.min(100, Number(body.probability) || 0));
      updateData.probability = p;
    }

    // Explicit contact-timer reset (e.g., logged a call without editing notes)
    if (body.resetContactedAt) {
      updateData.lastContactedAt = new Date();
    }

    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Rate limiting (apiLimiter — 20/min per IP).
    const ip = getClientIp(request);
    const { success } = await apiLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const authContext = await getAuthContext(request);
    
    if (!authContext) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }
    
    const role = authContext.role;
    const username = authContext.username;

    const { id } = await params;
    const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Sales can only delete their own leads; Admins can delete any
    if (role === 'SALES' && lead.agent !== username) {
      return NextResponse.json({ success: false, error: 'You can only delete your own leads' }, { status: 403 });
    }

    await prisma.lead.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
