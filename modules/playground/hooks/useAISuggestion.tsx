//why we need this hook ???
//this hook will manage Ai powered code suggestion inside a code editor (like monaco editor)
/*
how we will do it

this hook will keep a track of 
1.suggestion i.e the ai suggestion code text
2.isLoading i.e whether  we are waiting for the ai's response 
3.position like in vs code it keeps a track of the line number and column 
4.decoration i.e special visual markers in the editor like underlines or highlights
5.isEnabled i.e whether Ai Suggestions are turned on or off


Now Turning Ai suggestions on/off 
1. toggleEnabled() this simply flips isEnabled value
2.If diabled no Ai suggestions will be fetched


3.fetching an Ai suggestion

1.fetchingSuggestion(type,editor) does the heavy lifting

steps that it will follow
1.checks if Ai suggestions are enabled or not 
2.checks if the editor is available
3. gets:
   the entire code in the editor.
   The cursor position

4.sends this data to /api/code-suggestion (we will not use server actions this time we have to create an api fpor that)
5.waits for Ai respond   
6.if Ai sends a suggestions store it in state along with the cursor position
7.If something fails,logs the error and stop loading


4.ACCEPTING  A SUGGESTION

acceptSuggestion(editor,monaco) inserts the Ai suggestion directly into the code at the saved position
It also removes any highlist/decoration related to that suggestion 
after inserting , it clears the suggestion from memory

5.Rejecting or clearing  a suggestion

rejectSuggestion(editor) removes suggestion and highlishts without inserting anything
clearSuggestion(editor)  same as reject , but can be used in other cases(like aftger saving)

6.Return Value

thios hook returns
1.the current Ai suggestion state(all variables like suggestion,isLoading etc)
2.Functions to toggle fetch,accept,reject and clear suggestion









*/


"use client"

import {useState,useCallback} from "react"

interface AISuggestionsState {
    suggestion:string | null ,
    isLoading:boolean,
    position:{line:number , column:number} | null ,
    decoration:string[],
    isEnabled:boolean

}


interface UseAISuggestionsReturn extends AISuggestionsState {
    //define the methods that we will use
    toggleEnabled : () => void,
    fetchSuggestion: (type:string,editor:any) => Promise<void>
    acceptSuggestion:(editor:any,monaco:any) => void,
    rejectSuggestion:(editor:any) => void
    clearSuggestion:(editor:any) => void
}



export const useAISuggestions = ():UseAISuggestionsReturn => {
    const [state,setState] =  useState<AISuggestionsState>({
        suggestion:null,
        isLoading:false,
        position:null,
        decoration:[],
        isEnabled:true
    })

    //writing the toggleEnabled  function
    //it flips the default state 
    const toggleEnabled = useCallback(()=>{
        setState((prev)=>({...prev,isEnabled:!prev.isEnabled}))
    },[])


    const fetchSuggestion = useCallback(async(type:string,editor:any)=>{
        //check if suggestions are enabled or not 
        //for that we will use the functional state update to get fresh state
        setState((currentState)=>{
            if(!currentState.isEnabled){
                console.warn("AI suggestions are diabled")
                return currentState

            }
            //checking if editor is available
            if (!editor) {
                console.warn("Editor Insatance is not available")
                return currentState
            }

            //getting the entire code in the eitor 
            //and getting the position
            const model = editor.getModel()
            const cursorPosition = editor.getPosition()

            if (!model||!cursorPosition) {
                console.warn("Editor model or cursor position is not available.");
                 return currentState;
            }
            const newState = {...currentState,isLoading:true}

            //implementing IFFE
            (async () => {
                try {
                   const payload = {
                  fileContent: model.getValue(),
                  cursorLine: cursorPosition.lineNumber - 1,
                  cursorColumn: cursorPosition.column - 1,
                   suggestionType: type,
                 };
                 console.log("Request payload:", payload);  

                 const response = await fetch("/api/code-suggestion", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(payload),
                 });

                 if (!response.ok) {
                  throw new Error(`API responded with status ${response.status}`);
                 }

                 const data = await response.json();
                 console.log("API response:", data);

                   if (data.suggestion) {
                 const suggestionText = data.suggestion.trim();
                 setState((prev) => ({
                  ...prev,
                 suggestion: suggestionText,
                 position: {
                 line: cursorPosition.lineNumber,
                 column: cursorPosition.column,
                 },
                 isLoading: false,
                 }));
                 } else {
                  console.warn("No suggestion received from API.");
                  setState((prev) => ({ ...prev, isLoading: false }));
                 }
                




                } catch (error) {
                   console.error("Error fetching code suggestion:", error);
                  setState((prev) => ({ ...prev, isLoading: false })); 
                }
            })()

            return newState
        })
    },[])

    const acceptSuggestion = useCallback((editor:any,monaco:any)=>{
        setState((currentState)=>{
            if (!currentState.suggestion||!currentState.position||!editor||!monaco) {
                return currentState
                
            }

            const {line,column} = currentState.position
            const sanitizedSuggestion = currentState.suggestion.replace(/^\d+:\s*/gm, "");

            editor.executeEdits("", [
          {
            range: new monaco.Range(line, column, line, column),
            text: sanitizedSuggestion,
            forceMoveMarkers: true,
          },
          ]);

           // Clear decorations
         if (editor && currentState.decoration.length > 0) {
          editor.deltaDecorations(currentState.decoration, []);
         }

         return {
          ...currentState,
          suggestion: null,
          position: null,
          decoration: [],
         };
        })
    },[])

    const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
  };

}


//we could do all these things using manoco-pilot which was similar to github copilot for that we would have to do these things 
/*
1. Create API Route for AI Completions

// app/api/ai/completions/route.ts (OpenAI version) we could use any model no issue
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { prompt, language, context } = await request.json()

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert code completion assistant. Provide only code completions without explanations.`,
        },
        {
          role: "user",
          content: `Complete this ${language} code:\n\nContext:\n${context}\n\nLine to complete:\n${prompt}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.2,
    })

    return NextResponse.json({
      completion: completion.choices[0]?.message?.content || "",
    })
  } catch (error) {
    console.error("AI completion error:", error)
    return NextResponse.json(
      { error: "Failed to generate completion" },
      { status: 500 }
    )
  }
}

Create AI Code Suggestions Hook
// modules/playground/hooks/useAICompletions.ts
import { useState, useCallback } from "react"
import { debounce } from "lodash"

interface AICompletionOptions {
  language: string
  enabled: boolean
}

export function useAICompletions(options: AICompletionOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSuggestion, setLastSuggestion] = useState<string | null>(null)

  const getCompletion = useCallback(
    async (prompt: string, context: string): Promise<string | null> => {
      if (!options.enabled || !prompt.trim()) return null

      setIsLoading(true)
      try {
        const response = await fetch("/api/ai/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            language: options.language,
            context,
          }),
        })

        if (!response.ok) throw new Error("Failed to get completion")

        const data = await response.json()
        setLastSuggestion(data.completion)
        return data.completion
      } catch (error) {
        console.error("AI completion error:", error)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [options.enabled, options.language]
  )

  // Debounced version for real-time suggestions
  const getDebouncedCompletion = useCallback(
    debounce(getCompletion, 500),
    [getCompletion]
  )

  return {
    getCompletion,
    getDebouncedCompletion,
    isLoading,
    lastSuggestion,
  }
}

Enhanced Playground Editor with AI Completions

// modules/playground/components/playground-editor.tsx
"use client"

import React, { useRef, useEffect, useCallback, useState } from "react"
import Editor, { type Monaco } from "@monaco-editor/react"
import { configureMonaco, defaultEditorOptions, getEditorLanguage } from "../lib/editor-config"
import type { TemplateFile } from "../lib/path-to-json"
import { useAICompletions } from "../hooks/useAICompletions"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface PlaygroundEditorProps {
  activeFile: TemplateFile | undefined
  content: string
  onContentChange: (value: string) => void
}

const PlaygroundEditor = ({ activeFile, content, onContentChange }: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const { getCompletion, getDebouncedCompletion, isLoading } = useAICompletions({
    language: activeFile?.fileExtension || "javascript",
    enabled: aiEnabled,
  })

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    editor.updateOptions({
      ...defaultEditorOptions,
    })

    configureMonaco(monaco)
    updateEditorLanguage()
    registerAICompletionProvider(monaco, editor)
  }

  const updateEditorLanguage = () => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return

    const language = getEditorLanguage(activeFile.fileExtension || "")
    try {
      monacoRef.current.editor.setModelLanguage(model, language)
    } catch (error) {
      console.warn("Failed to set editor language:", error)
    }
  }

  const registerAICompletionProvider = useCallback(
    (monaco: Monaco, editor: any) => {
      // Register inline completion provider
      const provider = monaco.languages.registerInlineCompletionsProvider("*", {
        provideInlineCompletions: async (model, position, context, token) => {
          if (!aiEnabled) return { items: [] }

          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          })

          const currentLine = model.getLineContent(position.lineNumber)
          const lines = model.getLinesContent()
          const contextLines = lines.slice(Math.max(0, position.lineNumber - 10), position.lineNumber)

          const completion = await getCompletion(currentLine, contextLines.join("\n"))

          if (!completion) return { items: [] }

          return {
            items: [
              {
                insertText: completion,
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: position.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                },
              },
            ],
          }
        },
        freeInlineCompletions: () => {},
      })

      // Register command for manual AI completion
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, async () => {
        await triggerAICompletion()
      })

      return () => provider.dispose()
    },
    [aiEnabled, getCompletion]
  )

  const triggerAICompletion = async () => {
    if (!editorRef.current || !aiEnabled) return

    setIsGenerating(true)
    try {
      const model = editorRef.current.getModel()
      const position = editorRef.current.getPosition()
      const lines = model.getLinesContent()
      const contextLines = lines.slice(Math.max(0, position.lineNumber - 20), position.lineNumber)
      const currentLine = model.getLineContent(position.lineNumber)

      const completion = await getCompletion(currentLine, contextLines.join("\n"))

      if (completion) {
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: model.getLineMaxColumn(position.lineNumber),
        }

        editorRef.current.executeEdits("ai-completion", [
          {
            range,
            text: completion,
          },
        ])

        toast.success("AI completion applied")
      } else {
        toast.error("No completion available")
      }
    } catch (error) {
      console.error("AI completion error:", error)
      toast.error("Failed to generate completion")
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    updateEditorLanguage()
  }, [activeFile])

  return (
    <div className="h-full relative">
      // AI Controls 
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <Button
          size="sm"
          variant={aiEnabled ? "default" : "outline"}
          onClick={() => {
            setAiEnabled(!aiEnabled)
            toast.success(aiEnabled ? "AI suggestions disabled" : "AI suggestions enabled")
          }}
          className="gap-2"
        >
          <Sparkles className={`h-4 w-4 ${aiEnabled ? "text-yellow-400" : ""}`} />
          {aiEnabled ? "AI On" : "AI Off"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={triggerAICompletion}
          disabled={!aiEnabled || isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate (Ctrl+Space)
        </Button>
      </div>

       Loading Indicator 
      {isLoading && (
        <div className="absolute bottom-2 right-2 z-10 bg-background/80 backdrop-blur-sm border rounded-md px-3 py-1 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs text-muted-foreground">AI thinking...</span>
        </div>
      )}

      <Editor
        height="100%"
        value={content}
        onChange={(value) => onContentChange(value || "")}
        onMount={handleEditorDidMount}
        language={activeFile ? getEditorLanguage(activeFile.fileExtension || "") : "plaintext"}
        //@ts-ignore
        options={{
          ...defaultEditorOptions,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          suggestOnTriggerCharacters: true,
          inlineSuggest: {
            enabled: true,
          },
        }}
      />
    </div>
  )
}

export default PlaygroundEditor



Enhanced Editor Configuration for AI
// modules/playground/lib/editor-config.ts (additions)

export const aiEditorOptions = {
  ...defaultEditorOptions,
  
  // Enable inline suggestions
  inlineSuggest: {
    enabled: true,
    mode: "prefix",
  },

  // Quick suggestions
  quickSuggestions: {
    other: true,
    comments: false,
    strings: true,
  },

  // Suggest options
  suggest: {
    preview: true,
    showInlineDetails: true,
    snippetsPreventQuickSuggestions: false,
  },

  // Accept suggestions
  acceptSuggestionOnCommitCharacter: true,
  acceptSuggestionOnEnter: "on",

  // Trigger characters
  suggestOnTriggerCharacters: true,
}




Add AI Completion Indicator
// modules/playground/components/ai-status-indicator.tsx
"use client"

import { Sparkles, Loader2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIStatusIndicatorProps {
  enabled: boolean
  loading: boolean
  error?: string | null
}

export function AIStatusIndicator({ enabled, loading, error }: AIStatusIndicatorProps) {
  if (!enabled) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "bg-background/95 backdrop-blur-sm",
        "border rounded-lg shadow-lg",
        "px-3 py-2 flex items-center gap-2",
        "transition-all duration-200"
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-sm font-medium">AI generating...</span>
        </>
      ) : error ? (
        <>
          <XCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">AI Ready</span>
        </>
      )}
    </div>
  )
}




How It Works:

As you type, the editor sends context to your AI API
AI analyzes the code and generates completions
Suggestions appear inline (gray text)
Press Tab to accept the suggestion
Press Ctrl+Space for manual completion
















*/


