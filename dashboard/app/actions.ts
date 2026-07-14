'use server';

import prisma from '../lib/prisma';
import { revalidatePath } from 'next/cache';

interface ActivityEntry {
  action: string;
  details: string;
  timestamp: string;
}

export async function updateLeadStatus(
  leadId: number,
  newStatus: string,
  newActivity?: { action: string; details: string }
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error('Lead not found');

  let activityLog: ActivityEntry[] = [];
  try {
    activityLog = JSON.parse(lead.activity || '[]');
  } catch {
    activityLog = [];
  }

  if (newActivity) {
    activityLog.push({
      ...newActivity,
      timestamp: new Date().toISOString(),
    });
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: newStatus,
      activity: JSON.stringify(activityLog),
    },
  });

  revalidatePath('/pipeline');
  revalidatePath('/');
}
