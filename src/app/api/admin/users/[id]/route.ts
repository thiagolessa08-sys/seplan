// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await req.json() as { name?: string; role?: string; active?: boolean };

  // Whitelist to prevent arbitrary field injection
  const data: { name?: string; role?: Role; active?: boolean } = {};
  if (raw.name !== undefined) data.name = raw.name;
  if (raw.role !== undefined && ['ADMIN', 'ANALYST', 'VIEWER'].includes(raw.role)) {
    data.role = raw.role as Role;
  }
  if (raw.active !== undefined) data.active = raw.active;

  try {
    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
}
