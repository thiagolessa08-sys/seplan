// src/app/api/admin/agent/health/route.ts
import { NextResponse } from 'next/server';
import { agentHealth } from '@/lib/agent';

export async function GET() {
  try {
    const result = await agentHealth();
    return NextResponse.json({ ok: result.ok, agentUrl: process.env.AGENT_URL });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 503 });
  }
}
