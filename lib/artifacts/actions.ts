import { researchDocumentHandler } from '@/artifacts/research/server';

export function createResearch({ session, dataStream, chatId }) {
  return async function createResearch(args: { topic: string }) {
    const { topic } = args;

    try {
      // Initialize the research artifact
      dataStream.writeData({
        type: 'kind',
        content: 'research',
      });

      const documentId = crypto.randomUUID();

      dataStream.writeData({
        type: 'id',
        content: documentId,
      });

      dataStream.writeData({
        type: 'title',
        content: `Research: ${topic}`,
      });

      // Start with initial content
      dataStream.writeData({
        type: 'text-delta',
        content: `# Research: ${topic}\n\nInitiating research process...\n\n`,
      });

      // Update status to show we're starting
      dataStream.writeData({
        type: 'research-status',
        content: 'in-progress',
      });

      dataStream.writeData({
        type: 'research-progress',
        content: '0',
      });

      // Create the document in your database
      await createDocumentInDatabase({
        id: documentId,
        kind: 'research',
        title: `Research: ${topic}`,
        userId: session?.user?.id,
        chatId,
      });

      // Execute the research handler
      const content = await researchDocumentHandler.onCreateDocument({
        title: topic,
        dataStream,
      });

      // Update the final document
      await updateDocumentInDatabase({
        id: documentId,
        content,
      });

      // Mark as complete
      dataStream.writeData({
        type: 'research-status',
        content: 'complete',
      });

      dataStream.writeData({
        type: 'finish',
        content: '',
      });

      return `Research on "${topic}" is complete. You can view the full results in the research panel.`;
    } catch (error) {
      console.error('Research error:', error);
      dataStream.writeData({
        type: 'research-status',
        content: 'error',
      });
      throw error;
    }
  };
}
