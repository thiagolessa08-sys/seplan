// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { name?: string; role?: Role; active?: boolean };

  const user = await db.user.update({
    where: { id },
    data: body,
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  return NextResponse.json(user);
}
