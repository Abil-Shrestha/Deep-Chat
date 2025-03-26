import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getDeepResearchByChatId } from '@/lib/db/deep-research-queries';
import { getResearchUpdates } from '@/lib/redis';

export async function GET(
  request: Request,
  { params }: { params: { chatId: string } },
) {
  const session = await auth();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chatId = await params.chatId;
    const research = await getDeepResearchByChatId({ chatId });

    if (!research) {
      return NextResponse.json({ research: null });
    }

    let updates = [];

    // Only fetch updates from Redis if research is still in progress
    if (research.status === 'in_progress') {
      const rawUpdates = await getResearchUpdates(research.id);
      updates = rawUpdates.map((update: string) => JSON.parse(update));
    }

    return NextResponse.json({
      research: {
        ...research,
        updates,
      },
    });
  } catch (error) {
    console.error('Error fetching research data:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
