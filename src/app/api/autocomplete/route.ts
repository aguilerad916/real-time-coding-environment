import { NextRequest, NextResponse } from 'next/server';

// Define the maximum context length to send to Gemini
const MAX_CONTEXT_LENGTH = 5000;



export async function POST(request: NextRequest) {
  try {
    const { code, position, language } = await request.json();
    
    if (!code || position === undefined || !language) {
      return NextResponse.json(
        { error: 'Code, position, and language are required' },
        { status: 400 }
      );
    }
    
    // Extract cursor position and context
    const cursorPosition = position;
    const contextBefore = code.substring(Math.max(0, cursorPosition - MAX_CONTEXT_LENGTH / 2), cursorPosition);
    const contextAfter = code.substring(cursorPosition, Math.min(code.length, cursorPosition + MAX_CONTEXT_LENGTH / 2));
    
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Construct the prompt based on the language
    const prompt = constructPrompt(contextBefore, contextAfter, language);
    
    // Call Gemini API
    const suggestions = await getGeminiCompletions(prompt, apiKey);
    
    return NextResponse.json({ suggestions });
    
  } catch (error) {
    console.error('Autocompletion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code suggestions' },
      { status: 500 }
    );
  }
}

function constructPrompt(contextBefore: string, contextAfter: string, language: string): string {
  return `You are an expert ${language} programmer providing autocompletion suggestions. 
  Complete the code based on what comes before the cursor.
  Only provide code suggestions, no explanations.
  Keep suggestions concise and relevant to the current context.
  Provide up to 3 different completion options.
  
  Code before cursor:
  \`\`\`${language}
  ${contextBefore}
  \`\`\`
  
  Code after cursor (for context):
  \`\`\`${language}
  ${contextAfter}
  \`\`\`
  
  Completion suggestions:`;
}

async function getGeminiCompletions(prompt: string, apiKey: string): Promise<string[]> {
  const temperature = parseFloat(process.env.TEMPERATURE || '0.2');
  const maxTokens = parseInt(process.env.MAX_TOKENS_COMPLETION || '256', 10);
  const modelName = process.env.MODEL_NAME || 'gemini-1.5-pro';
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40
      }
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  try {
    // Extract the completion text
    const completionText = data.candidates[0].content.parts[0].text;
    
    // Parse individual suggestions from the completion
    // We're assuming Gemini returns suggestions in a structured format
    // This may need adjustment based on actual response format
    const suggestions = extractSuggestions(completionText);
    
    return suggestions;
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    console.error('Gemini response:', JSON.stringify(data, null, 2));
    return [];
  }
}

function extractSuggestions(text: string): string[] {
  // Remove any markdown formatting
  const cleaned = text.replace(/```[a-z]*\n/g, '').replace(/```/g, '');
  
  // Split by numbered markers, common separator lines, or bullet points
  const possibleSuggestions = cleaned
    .split(/\n\d+\.\s|\n\-{3,}\n|\n\*\s/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // If we couldn't identify separate suggestions, just use the whole text as one suggestion
  if (possibleSuggestions.length <= 1) {
    return [cleaned.trim()];
  }
  
  return possibleSuggestions.slice(0, 3); // Limit to 3 suggestions
}