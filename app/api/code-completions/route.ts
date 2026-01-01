/*
/api/code-completions
what will happen in this route file

1.Gets request from the editor
The frontend sends the entire file code , the cursor position,and what type of suggestion is needed

2.checks if the request is valid
Makes sure all the important information is present and correct 

3.understands the surrounding code
looks at 10 lines before the cursor and after the cursor
finds out the language and framework
checks if you are inside a function or class
detects if u are typing after comment 
looks for half written code patterns

4.Builds a clear instruction for the AI
describes the code context
tells the AI exactly what code to suggest
Includes rules like "keep proper indentation" and "folow best practices"

5.Talks to the AI model
sends the prepared instruction to an Ai running locally(ollama)
waits for the AI to return a suggestion

6.cleans up the AI's Answer
Removes extra formatting or markers
keeps only the code that should be inserted

7.Sends the suggestion back to frontend
Includes the suggestion,details about the code context,and some metadata(like language,framework,and time)



*/

import { type NextRequest,NextResponse } from "next/server";

//interface for the code data that we will send to ai
interface CodeSuggestionRequest {
    fileContent:string,
    cursorLine:number,
    cursorColumn:number,
    suggestionType:string,
    fileName:string
}

interface CodeContext{
    language:string,
    framework:string,
    beforeContext:string,
    currentLine:string,
    afterContext:string,
    cursorPosition:{line:number,column:number},
    isInFunction:boolean,
    isInClass:boolean,
    IsAfterComment:boolean,
    incompletePatterns:string[]
}


export async function POST(request:NextRequest){
    try {
        const body:CodeSuggestionRequest = await request.json()

        const{fileContent,cursorLine,cursorColumn,suggestionType,fileName} = body

        if (!fileContent||cursorLine<0||cursorColumn<0||!suggestionType||!fileName) {
            return NextResponse.json({error:"Invalid Input Parameters"},{status:400})
        }

        //analyze the code context 
        const context = analyzeCodeContext(fileContent,cursorLine,cursorColumn,fileName)

        //after analyzing build the prompt
        const prompt = BuildPrompt(context,suggestionType)

        //call the AI service (replace with your AI service)
        const suggestion = await generateSuggestion(prompt)


        return NextResponse.json({
            suggestion,
            context,
            metadata:{
                language: context.language,
                framework: context.framework,
                position: context.cursorPosition,
               generatedAt: new Date().toISOString(), 

            }
        })



    } catch (error:any) {
        console.error("Context analysis error:", error)
      return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 })
    }

}


//the functions that we have defined above analyzeContext , buildPrompt etc we will write the logic here
//first I will write the logic to detect the language, detectFrameWork , detectInClass , detectAfterComment , detectInCompletePATTERNS , GetLastNonEmptyLine

function detectLanguage(content:string , fileName:string):string{
    if(fileName){
        const extension = fileName.split(".").pop()?.toLowerCase() 
        //"index.test.ts".split(".") Splits the filename into parts using .
        // ["index", "test", "ts"]

        //pop() takes the last element
        //This is assumed to be the file extension

        const extensionMap:Record<string,string> = {
            ts: "TypeScript",
            tsx: "TypeScript",
            js: "JavaScript",
            jsx: "JavaScript",
            py: "Python",
            java: "Java",
            go: "Go",
            rs: "Rust",
            php: "PHP",
        }

        if (extension && extensionMap[extension]) {
            return extensionMap[extension]
        }

        //The above code is the al;ternative of 
        /*
        if (ext === "ts") return "TypeScript"
        if (ext === "js") return "JavaScript"
        ...
           
        
        */




    }

    //now content based detection
    if(content.includes("interface")||content.includes("string")||content.includes("type")){
        return "TypeScript"

    }
    if(content.includes("def ")||content.includes("import ")){
        return "Python"
    }
    if(content.includes("class ")||content.includes("import ")){
        return "Java"
    }
    if(content.includes("package ")||content.includes("import ")){
        return "Go"
    }
    if(content.includes("fn ")||content.includes("use ")){
        return "Rust"
    }
    if(content.includes("<?php")||content.includes("echo ")){
        return "PHP"
    }
    return "JavaScript"
}


//now function to detect Framework

function detectFramework(content:string,language:string):string{
    if(content.includes("import React")||content.includes("useState")){
        return "React"

    }
  if (content.includes("import Vue") || content.includes("<template>")) return "Vue"
  if (content.includes("@angular/") || content.includes("@Component")) return "Angular"
  if (content.includes("next/") || content.includes("getServerSideProps")) return "Next.js"

  return "None"
}

function detectInFunction(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i]
    if (line?.match(/^\s*(function|def|const\s+\w+\s*=|let\s+\w+\s*=)/)) return true
    if (line?.match(/^\s*}/)) break
  }
  return false
}

function detectInClass(lines: string[], currentLine: number): boolean {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i]
    if (line?.match(/^\s*(class|interface)\s+/)) return true
  }
  return false
}

function detectAfterComment(line: string, column: number): boolean {
  const beforeCursor = line.substring(0, column)
  return /\/\/.*$/.test(beforeCursor) || /#.*$/.test(beforeCursor)
}



function detectIncompletePatterns(line: string, column: number): string[] {
  const beforeCursor = line.substring(0, column)
  const patterns: string[] = []

  if (/^\s*(if|while|for)\s*\($/.test(beforeCursor.trim())) patterns.push("conditional")
  if (/^\s*(function|def)\s*$/.test(beforeCursor.trim())) patterns.push("function")
  if (/\{\s*$/.test(beforeCursor)) patterns.push("object")
  if (/\[\s*$/.test(beforeCursor)) patterns.push("array")
  if (/=\s*$/.test(beforeCursor)) patterns.push("assignment")
  if (/\.\s*$/.test(beforeCursor)) patterns.push("method-call")

  return patterns
}

function getLastNonEmptyLine(lines: string[], currentLine: number): string {
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.trim() !== "") return line
  }
  return ""
}





function analyzeCodeContext(content:string,line:number,column:number,fileName:string):CodeContext{

    const lines = content.split("\n")
    //after getting the lines we will get the currentLine
    const currentLine = lines[line] || "" 

    //get the surrounding context
    const contextRadius = 10
    const startLine = Math.max(0,line-contextRadius)
    const endLine = Math.min(lines.length,line+contextRadius)
    /*
     const contextRadius = 10
     This means:

     You want 10 lines before
     And 10 lines after
     Total window ≈ 21 lines
     This is standard in:
     Stack traces
     Compiler errors
     AI context windows
     Code review comments

     const startLine = Math.max(0, line - contextRadius)

     If you’re near the top of the file:
     line = 3
     contextRadius = 10

     line - contextRadius = -7 ❌
     Line -7 doesn’t exist.

     Math.max(0, -7) = 0
     Start from first line, not negative.

     similary for the endLine 
  
     
   
     
     
     
     
    */

    const beforeContext = lines.slice(startLine,line).join("\n")
    const afterContext = lines.slice(line + 1, endLine).join("\n")

  // Detect language and framework
  const language = detectLanguage(content, fileName)
  const framework = detectFramework(content,language)

  // Analyze code patterns
  const isInFunction = detectInFunction(lines, line)
  const isInClass = detectInClass(lines, line)
  const isAfterComment = detectAfterComment(currentLine, column)
  const incompletePatterns = detectIncompletePatterns(currentLine, column)

  return {
    language,
    framework,
    beforeContext,
    currentLine,
    afterContext,
    cursorPosition: { line, column },
    isInFunction,
    isInClass,
    isAfterComment,
    incompletePatterns,
  }


    

}

function BuildPrompt(context: CodeContext, suggestionType: string): string {
return `You are an expert code completion assistant. Generate a ${suggestionType} suggestion.

Language: ${context.language}
Framework: ${context.framework}

Context:
${context.beforeContext}
${context.currentLine.substring(0, context.cursorPosition.column)}|CURSOR|${context.currentLine.substring(context.cursorPosition.column)}
${context.afterContext}

Analysis:
- In Function: ${context.isInFunction}
- In Class: ${context.isInClass}
- After Comment: ${context.IsAfterComment}
- Incomplete Patterns: ${context.incompletePatterns.join(", ") || "None"}

Instructions:
1. Provide only the code that should be inserted at the cursor
2. Maintain proper indentation and style
3. Follow ${context.language} best practices
4. Make the suggestion contextually appropriate

Generate suggestion:`


}

async function generateSuggestion(prompt: string): Promise<string> {
  try {
    // Replace this with your actual AI service call
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "codellama:latest",
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          max_tokens: 300,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`)
    }

    const data = await response.json()
    let suggestion = data.response

    // Clean up the suggestion
    if (suggestion.includes("```")) {
      const codeMatch = suggestion.match(/```[\w]*\n?([\s\S]*?)```/)
      suggestion = codeMatch ? codeMatch[1].trim() : suggestion
    }

    // Remove cursor markers if present
    suggestion = suggestion.replace(/\|CURSOR\|/g, "").trim()

    return suggestion
  } catch (error) {
    console.error("AI generation error:", error)
    return "// AI suggestion unavailable"
  }
}