import { smoothStream, streamText } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { researchPrompt } from '@/lib/ai/prompts';

export const researchDocumentHandler = createDocumentHandler<'research'>({
  kind: 'research',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    try {
      // Initial content
      const initialContent = `# Research: ${title}\n\n`;
      draftContent += initialContent;
      dataStream.writeData({
        type: 'text-delta',
        content: initialContent,
      });

      const sections = [
        'Overview',
        'History',
        'Key Features',
        'Impact',
        'Conclusion',
      ];

      for (const section of sections) {
        console.log(`Starting section: ${section}`); // Add this for debugging

        // Announce new section
        dataStream.writeData({
          type: 'research-section',
          content: JSON.stringify({
            title: section,
            content: '',
            complete: false,
          }),
        });

        const { fullStream } = streamText({
          model: myProvider.languageModel('artifact-model'),
          system: researchPrompt,
          prompt: `Research this aspect of ${title}: ${section}`,
          experimental_transform: smoothStream({ chunking: 'word' }),
        });

        const sectionHeader = `\n## ${section}\n\n`;
        draftContent += sectionHeader;
        dataStream.writeData({
          type: 'text-delta',
          content: sectionHeader,
        });

        for await (const delta of fullStream) {
          if (delta.type === 'text-delta') {
            draftContent += delta.textDelta;
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
            content: draftContent,
            complete: true,
          }),
        });

        console.log(`Completed section: ${section}`); // Add this for debugging
      }

      return draftContent;
    } catch (error) {
      console.error('Research error:', error);
      throw error;
    }
  },

  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system: researchPrompt,
      prompt: `Update the research with new information: ${description}`,
      experimental_transform: smoothStream({ chunking: 'word' }),
    });

    for await (const delta of fullStream) {
      if (delta.type === 'text-delta') {
        draftContent += delta.textDelta;
        dataStream.writeData({
          type: 'text-delta',
          content: delta.textDelta,
        });
      }
    }

    return draftContent;
  },
});

// Helper function to simulate research steps
async function simulateResearchStep({ title, progress, dataStream }) {
  // Update progress
  dataStream.writeData({
    type: 'research-progress',
    content: progress.toString(),
  });

  // Add section
  const section = {
    title,
    content: '',
    complete: false,
  };

  dataStream.writeData({
    type: 'research-section',
    content: JSON.stringify(section),
  });

  // Simulate AI generating content for this section
  const { fullStream } = streamText({
    model: myProvider.languageModel('artifact-model'),
    system: 'You are conducting deep research.',
    prompt: `Research on this specific aspect: ${title}`,
    experimental_transform: smoothStream({ chunking: 'word' }),
  });

  let sectionContent = '';
  for await (const delta of fullStream) {
    if (delta.type === 'text-delta') {
      sectionContent += delta.textDelta;
      dataStream.writeData({
        type: 'text-delta',
        content: delta.textDelta,
      });
    }
  }

  // Add source example
  dataStream.writeData({
    type: 'research-source',
    content: JSON.stringify({
      title: `Source for ${title}`,
      url: `https://example.com/${title.toLowerCase().replace(/\s+/g, '-')}`,
    }),
  });

  // Mark section as complete
  section.content = sectionContent;
  section.complete = true;
  dataStream.writeData({
    type: 'research-section',
    content: JSON.stringify(section),
  });

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
