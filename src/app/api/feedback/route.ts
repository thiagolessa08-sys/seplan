// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { FeedbackPayload } from '@/types/domain';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as FeedbackPayload;
  if (body.rating == null || !body.naturalLanguage || !body.sql) {
    return NextResponse.json({ error: 'rating, naturalLanguage and sql required' }, { status: 400 });
  }

  const feedback = await db.feedback.create({
    data: {
      userId: session.user.id,
      rating: body.rating,
      comment: body.comment,
      naturalLanguage: body.naturalLanguage,
      sql: body.sql,
      rowCount: body.rowCount,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}
