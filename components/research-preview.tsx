import { Search as SearchIcon } from 'lucide-react';

interface ResearchPreviewProps {
  args: {
    query: string;
  };
  isReadonly: boolean;
}

export function ResearchPreview({ args, isReadonly }: ResearchPreviewProps) {
  return (
    <div className="mt-4 rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <SearchIcon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Deep Research Started</h3>
          <p className="text-sm text-muted-foreground">
            Researching: {args.query}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        The research is in progress. View the results in the research panel.
      </p>
    </div>
  );
}
