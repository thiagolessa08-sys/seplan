// src/app/(app)/chat/page.tsx
import { ChatWindow } from '@/components/chat/ChatWindow';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ChatPage() {
  const session = await auth();
  if (session?.user?.role === 'VIEWER') redirect('/favoritos');
  return <ChatWindow />;
}
