// src/app/api/admin/glossary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const glossary = await db.glossary.findUnique({ where: { id: 1 } });
  return NextResponse.json({ content: glossary?.content ?? '' });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const { content } = await req.json() as { content: string };

  const glossary = await db.glossary.upsert({
    where: { id: 1 },
    update: { content, updatedBy: session?.user.id },
    create: { id: 1, content, updatedBy: session?.user.id },
  });

  return NextResponse.json({ content: glossary.content });
}
