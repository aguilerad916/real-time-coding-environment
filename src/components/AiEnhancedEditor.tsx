"use client";
import { useRef, useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface AIEnhancedEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language: string;
  theme: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

export default function AIEnhancedEditor({
  value,
  onChange,
  language,
  theme,
  options = {}
}: AIEnhancedEditorProps) {
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);

  // Handle editor mounting
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof window.monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Register our custom completion provider
    registerAICompletionProvider(monaco, language);
    
    // Set up AI completion toggle keyboard shortcut (Ctrl+Space)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      // This will trigger the completion provider
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    });
  };

  // Update the completion provider when language changes
  useEffect(() => {
    if (monacoRef.current) {
      registerAICompletionProvider(monacoRef.current, language);
    }
  }, [language]);

  // Register our AI completion provider
  const registerAICompletionProvider = (monaco: typeof window.monaco, language: string) => {
    // Dispose any existing completion providers
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.', '(', '{', '[', ',', ' ', '\n'],
      provideCompletionItems: async (model, position) => {
        // Skip if AI is disabled
        if (!isAIEnabled) {
          return { suggestions: [] };
        }
        
        try {
          setIsLoading(true);
          
          // Get the current code and cursor position
          const code = model.getValue();
          const cursorOffset = model.getOffsetAt(position);
          
          // Call our autocomplete API
          const response = await fetch('/api/autocomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              position: cursorOffset,
              language,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to get AI suggestions');
          }
          
          const data = await response.json();
          const suggestions = data.suggestions || [];
          
          // Format the suggestions for Monaco editor
          const completionItems = suggestions.map((suggestion: string, index: number) => {
            return {
              label: suggestion.substring(0, 50) + (suggestion.length > 50 ? '...' : ''),
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: suggestion,
              detail: 'AI Suggestion',
              documentation: { value: 'Generated by Gemini AI' },
              sortText: `ai-${index.toString().padStart(5, '0')}`, // Ensure AI suggestions come first
            };
          });
          
          return {
            suggestions: completionItems,
          };
        } catch (error) {
          console.error('Error getting AI suggestions:', error);
          return { suggestions: [] };
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  return (
    <div className="relative h-full">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <button
          onClick={() => setIsAIEnabled(!isAIEnabled)}
          className={`text-xs px-2 py-1 rounded ${
            isAIEnabled ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-700'
          }`}
          title="Toggle AI-powered autocomplete"
        >
          {isAIEnabled ? 'AI: ON' : 'AI: OFF'}
        </button>
        {isLoading && (
          <div className="text-xs bg-blue-600 text-white px-2 py-1 rounded animate-pulse">
            AI thinking...
          </div>
        )}
      </div>
      
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        theme={theme}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          suggestOnTriggerCharacters: isAIEnabled,
          ...options,
        }}
      />
    </div>
  );
}