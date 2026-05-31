// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, naturalLanguage: true, sql: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, naturalLanguage, sql } = await req.json();
  if (!name || !naturalLanguage || !sql) {
    return NextResponse.json({ error: 'name, naturalLanguage and sql required' }, { status: 400 });
  }

  const favorite = await db.favorite.create({
    data: { userId: session.user.id, name, naturalLanguage, sql },
  });

  return NextResponse.json(favorite, { status: 201 });
}
