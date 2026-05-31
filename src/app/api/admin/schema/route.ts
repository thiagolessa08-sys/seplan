// src/app/api/admin/schema/route.ts
import { NextResponse } from 'next/server';
import { getSchema } from '@/lib/schema-cache';

export async function GET() {
  const tables = await getSchema();
  return NextResponse.json(tables);
}
