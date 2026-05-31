// src/app/api/admin/schema/refresh/route.ts
import { NextResponse } from 'next/server';
import { refreshSchema } from '@/lib/schema-cache';

export async function POST() {
  const tables = await refreshSchema();
  return NextResponse.json({ count: tables.length, refreshedAt: new Date().toISOString() });
}
