// src/types/domain.ts

export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableSchema {
  name: string;
  type: 'BASE' | 'VIEW';
  columns: ColumnDef[];
  includedInContext: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  count: number;
  truncated: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  result?: QueryResult;
  createdAt: Date;
}

export interface Favorite {
  id: string;
  name: string;
  naturalLanguage: string;
  sql: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackPayload {
  rating: 'POSITIVE' | 'NEGATIVE';
  comment?: string;
  naturalLanguage: string;
  sql: string;
  rowCount?: number;
}

// SSE event types sent from /api/chat
export type ChatSseEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_start'; tool: string }
  | { type: 'sql'; sql: string }
  | { type: 'result'; columns: string[]; rows: unknown[][]; count: number; truncated: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string };
