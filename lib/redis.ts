import { Redis } from '@upstash/redis';

// Initialize Redis client with environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Channel names for pub/sub
export const CHANNELS = {
  DEEP_RESEARCH: 'deep-research',
};

// Helper function to publish updates to a specific research
export async function publishResearchUpdate(researchId: string, data: any) {
  const channel = `${CHANNELS.DEEP_RESEARCH}:${researchId}`;
  return redis.publish(channel, JSON.stringify(data));
}

// Helper function to get all updates for a research
export async function getResearchUpdates(researchId: string) {
  const key = `updates:${researchId}`;
  return redis.lrange(key, 0, -1);
}

// Helper function to save an update to the research history
export async function saveResearchUpdate(researchId: string, data: any) {
  const key = `updates:${researchId}`;
  await redis.lpush(key, JSON.stringify(data));
  // Keep only the last 100 updates
  await redis.ltrim(key, 0, 99);
}

export default redis;