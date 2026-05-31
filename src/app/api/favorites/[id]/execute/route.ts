// src/app/api/favorites/[id]/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentRunQuery } from '@/lib/agent';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const fav = await db.favorite.findUnique({ where: { id } });
  if (!fav) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // All roles can execute favorites
  const result = await agentRunQuery(
    fav.sql,
    Number(process.env.DEFAULT_QUERY_LIMIT) || 100
  );

  return NextResponse.json(result);
}
