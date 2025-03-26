import { db } from '@/lib/db/queries';
import * as schema from '@/lib/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { publishResearchUpdate, saveResearchUpdate } from '@/lib/redis';

// Check if a chat exists
export async function checkChatExists({
  chatId,
}: {
  chatId: string;
}): Promise<boolean> {
  try {
    const existingChat = await db
      .select({ id: schema.chat.id })
      .from(schema.chat)
      .where(eq(schema.chat.id, chatId))
      .limit(1);

    return existingChat.length > 0;
  } catch (error) {
    console.error('Failed to check if chat exists:', error);
    throw error;
  }
}

// Create a new deep research request
export async function createDeepResearch({
  chatId,
  userId,
  query,
}: {
  chatId: string;
  userId: string;
  query: string;
}) {
  try {
    // First check if the chat exists
    const chatExists = await checkChatExists({ chatId });

    if (!chatExists) {
      throw new Error(`Chat with ID ${chatId} does not exist`);
    }

    const now = new Date();

    const [research] = await db
      .insert(schema.deepResearch)
      .values({
        chatId,
        userId,
        query,
        status: 'pending',
        results: {},
        metadata: {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return research;
  } catch (error) {
    console.error('Failed to create deep research:', error);
    throw error;
  }
}

// Get a deep research by ID
export async function getDeepResearchById({
  id,
}: {
  id: string;
}) {
  try {
    const [research] = await db
      .select()
      .from(schema.deepResearch)
      .where(eq(schema.deepResearch.id, id))
      .limit(1);

    return research;
  } catch (error) {
    console.error('Failed to get deep research:', error);
    throw error;
  }
}

// Get deep research by chat ID
export async function getDeepResearchByChatId({
  chatId,
}: {
  chatId: string;
}) {
  try {
    const researches = await db
      .select()
      .from(schema.deepResearch)
      .where(eq(schema.deepResearch.chatId, chatId))
      .orderBy(desc(schema.deepResearch.createdAt));

    return researches;
  } catch (error) {
    console.error('Failed to get deep research by chat ID:', error);
    throw error;
  }
}

// Update deep research status
export async function updateDeepResearchStatus({
  id,
  status,
  results = {},
  metadata = {},
  error,
  startedAt,
  completedAt,
}: {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  results?: any;
  metadata?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}) {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Only include fields that are provided
    if (results && Object.keys(results).length > 0) {
      updateData.results = results;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      updateData.metadata = metadata;
    }

    if (error !== undefined) {
      updateData.error = error;
    }

    if (startedAt !== undefined) {
      updateData.startedAt = startedAt;
    }

    if (completedAt !== undefined) {
      updateData.completedAt = completedAt;
    }

    const [research] = await db
      .update(schema.deepResearch)
      .set(updateData)
      .where(eq(schema.deepResearch.id, id))
      .returning();

    // Publish update to Redis
    const updateData2 = {
      type: 'status_update',
      status,
      ...(error && { error }),
      timestamp: new Date().toISOString(),
    };

    await publishResearchUpdate(id, updateData2);
    await saveResearchUpdate(id, updateData2);

    return research;
  } catch (error) {
    console.error('Failed to update deep research status:', error);
    throw error;
  }
}

// Create a deep research step
export async function createDeepResearchStep({
  researchId,
  stepOrder,
  stepType,
  status = 'pending',
  data = {},
}: {
  researchId: string;
  stepOrder: number;
  stepType:
    | 'web_search'
    | 'website_visit'
    | 'content_analysis'
    | 'summary_generation';
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: any;
}) {
  try {
    const now = new Date();

    const [step] = await db
      .insert(schema.deepResearchStep)
      .values({
        researchId,
        stepOrder,
        stepType,
        status,
        data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Publish step creation to Redis
    const updateData = {
      type: 'step_created',
      stepId: step.id,
      stepType,
      stepOrder,
      status,
      timestamp: now.toISOString(),
    };

    await publishResearchUpdate(researchId, updateData);
    await saveResearchUpdate(researchId, updateData);

    return step;
  } catch (error) {
    console.error('Failed to create deep research step:', error);
    throw error;
  }
}

// Update a deep research step
export async function updateDeepResearchStep({
  id,
  status,
  data = {},
  error,
  startedAt,
  completedAt,
}: {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  data?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}) {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Only include fields that are provided
    if (data && Object.keys(data).length > 0) {
      updateData.data = data;
    }

    if (error !== undefined) {
      updateData.error = error;
    }

    if (startedAt !== undefined) {
      updateData.startedAt = startedAt;
    }

    if (completedAt !== undefined) {
      updateData.completedAt = completedAt;
    }

    const [step] = await db
      .update(schema.deepResearchStep)
      .set(updateData)
      .where(eq(schema.deepResearchStep.id, id))
      .returning();

    // Get the research ID for this step
    const researchId = step.researchId;

    // Publish step update to Redis
    const updateData2 = {
      type: 'step_update',
      stepId: id,
      stepType: step.stepType,
      stepOrder: step.stepOrder,
      status,
      ...(error && { error }),
      ...(data && Object.keys(data).length > 0 && { data }),
      timestamp: new Date().toISOString(),
    };

    await publishResearchUpdate(researchId, updateData2);
    await saveResearchUpdate(researchId, updateData2);

    return step;
  } catch (error) {
    console.error('Failed to update deep research step:', error);
    throw error;
  }
}

// Get all steps for a research
export async function getDeepResearchSteps({
  researchId,
}: {
  researchId: string;
}) {
  try {
    const steps = await db
      .select()
      .from(schema.deepResearchStep)
      .where(eq(schema.deepResearchStep.researchId, researchId))
      .orderBy(asc(schema.deepResearchStep.stepOrder));

    return steps;
  } catch (error) {
    console.error('Failed to get deep research steps:', error);
    throw error;
  }
}

// Get a specific step by ID
export async function getDeepResearchStepById({
  id,
}: {
  id: string;
}) {
  try {
    const [step] = await db
      .select()
      .from(schema.deepResearchStep)
      .where(eq(schema.deepResearchStep.id, id))
      .limit(1);

    return step;
  } catch (error) {
    console.error('Failed to get deep research step:', error);
    throw error;
  }
}

// Get the latest step for a research
export async function getLatestDeepResearchStep({
  researchId,
}: {
  researchId: string;
}) {
  try {
    const steps = await db
      .select()
      .from(schema.deepResearchStep)
      .where(eq(schema.deepResearchStep.researchId, researchId))
      .orderBy(desc(schema.deepResearchStep.stepOrder))
      .limit(1);

    return steps[0] || null;
  } catch (error) {
    console.error('Failed to get latest deep research step:', error);
    throw error;
  }
}
