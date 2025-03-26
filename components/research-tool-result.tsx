import { memo } from 'react';
import { SearchIcon } from 'lucide-react';
import { useArtifact } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import type { DeepResearch } from '@/lib/db/schema';
import type { UIArtifact } from '@/components/artifact';

interface ResearchToolResultProps {
  result: {
    id: string;
    query: string;
  };
  isReadonly: boolean;
}

function PureResearchToolResult({
  result,
  isReadonly,
}: ResearchToolResultProps) {
  const { setArtifact } = useArtifact();
  const { data } = useSWR<{ research: DeepResearch }>(
    `/api/research?id=${result.id}`,
    fetcher,
  );

  const research = data?.research;

  console.log('Research data:', {
    id: result.id,
    research: research,
    resultsType: research ? typeof research.results : 'no research data',
  });

  return (
    <button
      type="button"
      className="bg-background cursor-pointer border py-2 px-3 rounded-xl w-fit flex flex-row gap-3 items-start"
      onClick={(event) => {
        if (isReadonly) {
          toast.error(
            'Viewing research in shared chats is currently not supported.',
          );
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const boundingBox = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        if (!research) {
          toast.error('Research data not found');
          return;
        }

        console.log('Processing research results:', {
          resultsType: typeof research.results,
          results: research.results,
        });

        let researchContent = '';
        if (typeof research.results === 'string') {
          researchContent = research.results;
        } else {
          try {
            const results = research.results as {
              searchResults?: Array<{
                title: string;
                content: string;
                url: string;
              }>;
              analysis?: string;
              summary?: string;
            };

            if (results.summary) {
              researchContent = `# Research Summary: ${result.query}\n\n${results.summary}\n\n`;
            }

            if (results.analysis) {
              researchContent += `## Detailed Analysis\n\n${results.analysis}\n\n`;
            }

            if (results.searchResults?.length) {
              researchContent += `## Sources\n\n`;
              results.searchResults.forEach((source) => {
                researchContent += `### ${source.title}\n${source.content}\nSource: ${source.url}\n\n`;
              });
            }

            console.log('Generated research content:', {
              summary: !!results.summary,
              analysis: !!results.analysis,
              sourcesCount: results.searchResults?.length,
              contentLength: researchContent.length,
            });
          } catch (error) {
            console.error('Error parsing research results:', error);
            researchContent = JSON.stringify(research.results, null, 2);
          }
        }

        // Create the artifact with all required properties
        const artifact: UIArtifact = {
          documentId: result.id,
          kind: 'research',
          content: researchContent,
          title: `Research: ${result.query}`,
          isVisible: true,
          status: 'idle',
          boundingBox,
          // Initialize metadata so we don't need the default initialization
          metadata: {
            status: 'complete',
            progress: 100,
            sections: [],
            sources: [],
          },
        };

        setArtifact(artifact);
      }}
    >
      <div className="text-muted-foreground mt-1">
        <SearchIcon size={16} />
      </div>
      <div className="text-left">
        {`Completed research on "${result.query}"`}
      </div>
    </button>
  );
}

export const ResearchToolResult = memo(PureResearchToolResult, () => true);
