import { type DataStreamWriter, tool, streamText, smoothStream } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import {
  createDeepResearch,
  updateDeepResearchStatus,
} from '@/lib/db/deep-research-queries';
import { myProvider } from '@/lib/ai/providers';

interface CreateResearchProps {
  session: Session;
  dataStream: DataStreamWriter;
  chatId?: string;
}

export const createResearch = ({
  session,
  dataStream,
  chatId,
}: CreateResearchProps) =>
  tool({
    description:
      'Create a deep research session to search the web for information on a specific topic. This will search the web and provide detailed information to the user.',
    parameters: z.object({
      query: z.string().describe('The search query or topic to research'),
      chatId: z
        .string()
        .optional()
        .describe('The ID of the chat this research is associated with'),
    }),
    execute: async ({ query, chatId: toolChatId }) => {
      const finalChatId = toolChatId || chatId;
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      if (!finalChatId) {
        throw new Error('Chat ID not provided');
      }

      let research;
      let fullContent = '';

      try {
        // Create research record
        research = await createDeepResearch({
          chatId: finalChatId,
          userId: session.user.id,
          query,
        });

        // Initialize research artifact
        dataStream.writeData({
          type: 'kind',
          content: 'research',
        });

        dataStream.writeData({
          type: 'id',
          content: research.id,
        });

        dataStream.writeData({
          type: 'title',
          content: `Research: ${query}`,
        });

        // Update status to in_progress
        await updateDeepResearchStatus({
          id: research.id,
          status: 'in_progress',
          startedAt: new Date(),
        });

        // Initial content
        const initialContent = `# Deep Research: ${query}\n\n`;
        fullContent += initialContent;
        dataStream.writeData({
          type: 'text-delta',
          content: initialContent,
        });

        // Define research sections
        const sections = [
          'Overview',
          'Historical Context',
          'Key Concepts',
          'Current Developments',
          'Future Implications',
        ];

        // Process each section
        for (const section of sections) {
          // Start section
          dataStream.writeData({
            type: 'research-section',
            content: JSON.stringify({
              title: section,
              content: '',
              complete: false,
            }),
          });

          // Add section header
          const sectionHeader = `\n## ${section}\n\n`;
          fullContent += sectionHeader;
          dataStream.writeData({
            type: 'text-delta',
            content: sectionHeader,
          });

          // Generate section content
          const { fullStream } = streamText({
            model: myProvider.languageModel('artifact-model'),
            system: `You are conducting in-depth research on ${query}. 
                    Focus on the ${section} aspect with accurate, well-structured information.
                    Use an academic tone and provide specific details.`,
            prompt: `Provide a detailed analysis of the ${section} of ${query}.`,
            experimental_transform: smoothStream({ chunking: 'word' }),
          });

          // Stream section content
          for await (const delta of fullStream) {
            if (delta.type === 'text-delta') {
              fullContent += delta.textDelta;
              dataStream.writeData({
                type: 'text-delta',
                content: delta.textDelta,
              });
            }
          }

          // Mark section complete
          dataStream.writeData({
            type: 'research-section',
            content: JSON.stringify({
              title: section,
              content: fullContent,
              complete: true,
            }),
          });

          // Brief pause between sections
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Update final results in the database
        await updateDeepResearchStatus({
          id: research.id,
          results: fullContent,
          status: 'completed',
          completedAt: new Date(),
        });

        // Update status to complete
        await updateDeepResearchStatus({
          id: research.id,
          status: 'completed',
          completedAt: new Date(),
        });

        // Mark streaming as complete
        dataStream.writeData({
          type: 'finish',
          content: '',
        });

        return {
          id: research.id,
          query,
          kind: 'research',
          content: `I've started a deep research session on "${query}". You can view the progress in the research panel.`,
        };
      } catch (error) {
        console.error('Error in createResearch tool:', error);
        if (research?.id) {
          await updateDeepResearchStatus({
            id: research.id,
            status: 'failed',
            error: error.message,
          });
        }
        throw error;
      }
    },
  });
