import type { Artifact as ArtifactType } from '@/components/create-artifact';

export type ResearchArtifactMetadata = {
  status: 'pending' | 'in-progress' | 'complete';
  progress: number;
  sections: Array<{
    title: string;
    content: string;
    complete: boolean;
  }>;
  sources: Array<{
    title: string;
    url: string;
  }>;
};

export type ResearchArtifact = ArtifactType<
  'research',
  ResearchArtifactMetadata
>;
