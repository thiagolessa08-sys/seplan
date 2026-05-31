// src/app/api/health/route.ts
// Unauthenticated health check endpoint for Railway
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true });
}
