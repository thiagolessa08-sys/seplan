// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Middleware already enforces ADMIN role for /api/admin/*

export async function GET() {
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { email, name, password, role } = await req.json();
  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'email, name, password, role required' }, { status: 400 });
  }
  // Role validation
  const validRoles = ['ADMIN', 'ANALYST', 'VIEWER'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password as string, 12);
  try {
    const user = await db.user.create({
      data: { email, name, passwordHash, role },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }
}
