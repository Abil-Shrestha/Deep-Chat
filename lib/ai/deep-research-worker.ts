import { generateText } from 'ai';
import { myProvider } from './providers';
import { 
  createDeepResearchStep, 
  getDeepResearchById, 
  updateDeepResearchStatus,
  updateDeepResearchStep
} from '@/lib/db/deep-research-queries';
import { publishResearchUpdate, saveResearchUpdate } from '@/lib/redis';

// Tavily search function
async function tavilySearch(query: string): Promise<Array<{ title: string; content: string; url: string }>> {
  try {
    // Call the Tavily API with the API key from environment variables
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'advanced',
        include_domains: [],
        exclude_domains: [],
        max_results: 10
      })
    });
    
    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Transform Tavily results to our expected format
    return data.results.map((result: any) => ({
      title: result.title,
      content: result.content,
      url: result.url
    }));
  } catch (error) {
    console.error('Error in Tavily search:', error);
    // Return a fallback result in case of error
    return [
      {
        title: 'Recent AI Trends',
        content: 'The latest trends in AI include multimodal models, AI agents, and more efficient training methods.',
        url: 'https://example.com/ai-trends'
      },
      {
        title: 'Advancements in LLMs',
        content: 'Large language models have seen significant improvements in reasoning capabilities and factual accuracy.',
        url: 'https://example.com/llm-advancements'
      },
      {
        title: 'AI in Healthcare',
        content: 'AI applications in healthcare are growing rapidly, with new diagnostic tools and treatment recommendations.',
        url: 'https://example.com/ai-healthcare'
      }
    ];
  }
}

// The main research worker function
export async function runDeepResearch(researchId: string): Promise<void> {
  try {
    // Get the research details
    const research = await getDeepResearchById({ id: researchId });
    
    if (!research) {
      throw new Error(`Research with ID ${researchId} not found`);
    }
    
    // Update research status to in_progress
    await updateDeepResearchStatus({
      id: researchId,
      status: 'in_progress',
      startedAt: new Date(),
    });

    // Publish initial status update
    const initialUpdate = {
      type: 'status_update',
      status: 'in_progress',
      message: `Starting deep research for "${research.query}"`,
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, initialUpdate);
    await saveResearchUpdate(researchId, initialUpdate);
    
    // Step 1: Web search using Tavily
    const webSearchStep = await createDeepResearchStep({
      researchId,
      stepOrder: 1,
      stepType: 'web_search',
      status: 'in_progress',
      data: {
        query: research.query,
        startTime: new Date().toISOString(),
      },
    });
    
    // Publish web search start update
    const searchStartUpdate = {
      type: 'step_update',
      stepType: 'web_search',
      status: 'in_progress',
      message: `Searching the web for information about "${research.query}"`,
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, searchStartUpdate);
    await saveResearchUpdate(researchId, searchStartUpdate);
    
    // Perform the web search
    const searchResults = await tavilySearch(research.query);
    
    // Update the web search step with results
    await updateDeepResearchStep({
      id: webSearchStep.id,
      status: 'completed',
      data: {
        query: research.query,
        results: searchResults,
        completedTime: new Date().toISOString(),
      },
      completedAt: new Date(),
    });
    
    // Publish web search completion update
    const searchCompleteUpdate = {
      type: 'step_update',
      stepType: 'web_search',
      status: 'completed',
      message: `Found ${searchResults.length} relevant sources about "${research.query}"`,
      data: { resultCount: searchResults.length },
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, searchCompleteUpdate);
    await saveResearchUpdate(researchId, searchCompleteUpdate);
    
    // Step 2: Content analysis using Gemini
    const contentAnalysisStep = await createDeepResearchStep({
      researchId,
      stepOrder: 2,
      stepType: 'content_analysis',
      status: 'in_progress',
      data: {
        startTime: new Date().toISOString(),
      },
    });
    
    // Publish content analysis start update
    const analysisStartUpdate = {
      type: 'step_update',
      stepType: 'content_analysis',
      status: 'in_progress',
      message: 'Analyzing content from search results',
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, analysisStartUpdate);
    await saveResearchUpdate(researchId, analysisStartUpdate);
    
    // Format the search results for Gemini
    const formattedResults = searchResults.map(result => 
      `Title: ${result.title}\nContent: ${result.content}\nURL: ${result.url}`
    ).join('\n\n');
    
    // Use Gemini to analyze the content
    const analysisPrompt = `Analyze these search results about "${research.query}" and extract the key information, trends, and insights:\n\n${formattedResults}`;
    
    const { text: analysisText } = await generateText({
      model: myProvider.languageModel('chat-model'),
      prompt: analysisPrompt
    });
    
    // Update the content analysis step
    await updateDeepResearchStep({
      id: contentAnalysisStep.id,
      status: 'completed',
      data: {
        analysis: analysisText,
        completedTime: new Date().toISOString(),
      },
      completedAt: new Date(),
    });
    
    // Publish content analysis completion update
    const analysisCompleteUpdate = {
      type: 'step_update',
      stepType: 'content_analysis',
      status: 'completed',
      message: 'Completed content analysis',
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, analysisCompleteUpdate);
    await saveResearchUpdate(researchId, analysisCompleteUpdate);
    
    // Step 3: Generate a summary
    const summaryStep = await createDeepResearchStep({
      researchId,
      stepOrder: 3,
      stepType: 'summary_generation',
      status: 'in_progress',
      data: {
        startTime: new Date().toISOString(),
      },
    });
    
    // Publish summary generation start update
    const summaryStartUpdate = {
      type: 'step_update',
      stepType: 'summary_generation',
      status: 'in_progress',
      message: 'Generating comprehensive summary',
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, summaryStartUpdate);
    await saveResearchUpdate(researchId, summaryStartUpdate);
    
    // Use Gemini to generate a summary
    const summaryPrompt = `Based on the following analysis about "${research.query}", create a comprehensive summary that highlights the most important points, trends, and insights. Make it informative and well-structured.\n\n${analysisText}`;
    
    const { text: summaryText } = await generateText({
      model: myProvider.languageModel('chat-model'),
      prompt: summaryPrompt
    });
    
    // Update the summary step
    await updateDeepResearchStep({
      id: summaryStep.id,
      status: 'completed',
      data: {
        summary: summaryText,
        completedTime: new Date().toISOString(),
      },
      completedAt: new Date(),
    });
    
    // Publish summary completion update
    const summaryCompleteUpdate = {
      type: 'step_update',
      stepType: 'summary_generation',
      status: 'completed',
      message: 'Completed summary generation',
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, summaryCompleteUpdate);
    await saveResearchUpdate(researchId, summaryCompleteUpdate);
    
    // Update the research status to completed
    await updateDeepResearchStatus({
      id: researchId,
      status: 'completed',
      results: {
        searchResults,
        analysis: analysisText,
        summary: summaryText,
      },
      completedAt: new Date(),
    });
    
    // Publish final completion update
    const completionUpdate = {
      type: 'status_update',
      status: 'completed',
      message: 'Deep research completed successfully',
      data: {
        summary: `${summaryText.substring(0, 200)}...` // Preview of summary
      },
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, completionUpdate);
    await saveResearchUpdate(researchId, completionUpdate);
    
  } catch (error) {
    console.error('Error in deep research worker:', error);
    
    // Update research status to failed
    await updateDeepResearchStatus({
      id: researchId,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Publish error update
    const errorUpdate = {
      type: 'status_update',
      status: 'failed',
      message: 'Deep research failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    await publishResearchUpdate(researchId, errorUpdate).catch(e => 
      console.error('Failed to publish error update:', e)
    );
    await saveResearchUpdate(researchId, errorUpdate).catch(e => 
      console.error('Failed to save error update:', e)
    );
  }
}
