import { Artifact } from '@/components/create-artifact';
import type { ResearchArtifactMetadata } from './types';
import type { UIArtifact } from '@/components/artifact';
import type { ReactNode } from 'react';
import { CopyIcon } from '@/components/icons';
import { toast } from 'sonner';
import type { ArtifactActionContext } from '@/components/create-artifact';

// Create a separate content component
const ResearchContent = ({
  content,
  metadata,
  setMetadata,
}: {
  content: string;
  metadata: ResearchArtifactMetadata;
  setMetadata: (metadata: ResearchArtifactMetadata) => void;
}): ReactNode => {
  // Provide default values if metadata is null
  const sections = metadata?.sections || [];
  const researchStatus = metadata?.status || 'pending';

  return (
    <div className="p-4 space-y-4">
      {/* Progress and sections */}
      <div className="space-y-2">
        {sections.map((section, index) => (
          <div
            key={`section-${section.title}-${index}`}
            className={`p-2 border rounded ${
              section.complete ? 'border-green-500' : 'border-gray-300'
            }`}
          >
            <h4 className="font-medium flex items-center gap-2">
              {section.title}
              {section.complete && <span className="text-green-500">✓</span>}
            </h4>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
        {content ||
          (researchStatus === 'pending'
            ? 'Initializing research...'
            : 'Research in progress...')}
      </div>
    </div>
  );
};

export const researchArtifact = new Artifact<
  'research',
  ResearchArtifactMetadata
>({
  kind: 'research',
  description: 'Deep research on complex topics with comprehensive analysis.',
  content: ResearchContent,
  actions: [
    {
      icon: <CopyIcon />,
      description: 'Copy research to clipboard',
      onClick: async ({
        content,
      }: ArtifactActionContext<ResearchArtifactMetadata>) => {
        try {
          await navigator.clipboard.writeText(content);
          toast.success('Research copied to clipboard');
        } catch (error) {
          toast.error('Failed to copy research to clipboard');
        }
      },
    },
  ],
  initialize: async ({ documentId, setMetadata }) => {
    // Initialize with default values
    setMetadata({
      status: 'pending',
      progress: 0,
      sections: [],
      sources: [],
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    console.log('Research stream part:', streamPart);

    if (streamPart.type === 'text-delta') {
      setArtifact((draft: UIArtifact) => {
        const currentContent = draft.content || '';
        return {
          ...draft,
          content: currentContent + (streamPart.content as string),
          status: 'streaming',
          isVisible: true,
        };
      });
    } else if (streamPart.type === 'research-section') {
      try {
        const section = JSON.parse(streamPart.content as string);
        const currentMetadata: ResearchArtifactMetadata = {
          status: 'in-progress',
          progress: 0,
          sections: [],
          sources: [],
        };

        const existingIndex = currentMetadata.sections.findIndex(
          (s) => s.title === section.title,
        );
        const newSections = [...currentMetadata.sections];

        if (existingIndex >= 0) {
          newSections[existingIndex] = section;
        } else {
          newSections.push(section);
        }

        setMetadata({
          ...currentMetadata,
          sections: newSections,
        });
      } catch (error) {
        console.error('Error parsing research section:', error);
      }
    } else if (streamPart.type === 'finish') {
      // Update both artifact status and metadata
      setArtifact((draft: UIArtifact) => ({
        ...draft,
        status: 'idle',
        isVisible: true,
      }));

      // Update metadata to mark research as complete
      setMetadata({
        status: 'complete',
        progress: 100,
        sections: [],
        sources: [],
      });
    }
  },
  toolbar: [],
});
