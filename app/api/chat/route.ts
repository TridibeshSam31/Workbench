//end point for chat messages 
//what is the purpose of this end Point 
//chat based Ai responses deta hai (jaise Chatgpt)
//Local Ai model (ollama+codelamma) se connection
//conversation memory (history) ko handle krta hai 
//Frontend → API → AI Model → Response → Frontend

import { NextResponse, NextRequest } from "next/server";
import OpenAI from "openai";

interface ChatMessage {
    role: "user" | "assistant",
    content: string
}

interface ChatRequest {
    message: string
    history?: ChatMessage[]
    mode?: string
    model?: string
}

interface AIResult {
    text: string
    model: string
    tokens?: number
}

export async function POST(req: NextRequest) {
    try {
        const body: ChatRequest = await req.json()
        const { message, history = [], model } = body //destructuring the message and history from the body

        //validation of the input 'message'
        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Message Must be a string" }, { status: 400 })
        }

        //validate history format
        const validHistory = Array.isArray(history) ? history.filter(
            (msg) => msg &&
                typeof msg === "object" &&
                typeof msg.role === "string" &&
                typeof msg.content === "string" &&
                ["user", "assistant"].includes(msg.role)
        ) : []

        //validHistory security and stability ke liye likha hai 
        //jo malformed data hai woh reject hoga 
        //sirf valid roles allowed honge only user and assistant

        const recenHistory = validHistory.slice(-10)

        //why this history is needed ?? 
        //when the user will ask fix this code 
        //ai:which code ?? 
        /*

        history = [
       { role: "user", content: "Explain this function" },
      { role: "assistant", content: "This function does..." },
      ]

      Next request me hum poora conversation dubara bhejte ho.
      AI ke liye:

     “Achha, yeh wahi function wali baat chal rahi hai.”


      recentHistory mai hum jo validHistory  ke last 10 msgs ko yaad rkhte hai 
      example 

      validHistory

      [
  { role: "user", content: "Hi" },              // 1
  { role: "assistant", content: "Hello!" },     // 2
  { role: "user", content: "JS kya hai?" },     // 3
  { role: "assistant", content: "JavaScript..." }, // 4
  { role: "user", content: "Closures?" },       // 5
  { role: "assistant", content: "Closures..." },// 6
  { role: "user", content: "Promises?" },       // 7
  { role: "assistant", content: "Promises..." },// 8
  { role: "user", content: "Async/await?" },    // 9
  { role: "assistant", content: "Async..." },   // 10
  { role: "user", content: "Event loop?" },     // 11
  { role: "assistant", content: "Event loop..." } // 12
   ]

   const recentHistory = validHistory.slice(-10)

   [
  { role: "user", content: "JS kya hai?" },         // 3
  { role: "assistant", content: "JavaScript..." }, // 4
  { role: "user", content: "Closures?" },          // 5
  { role: "assistant", content: "Closures..." },   // 6
  { role: "user", content: "Promises?" },          // 7
  { role: "assistant", content: "Promises..." },   // 8
  { role: "user", content: "Async/await?" },       // 9
  { role: "assistant", content: "Async..." },      // 10
  { role: "user", content: "Event loop?" },        // 11
  { role: "assistant", content: "Event loop..." }  // 12
  ]

        */

     const messages: ChatMessage[] = [
        ...recenHistory,
        { role: "user", content: message }
     ]

     //generate Ai response (OpenAI ya Ollama fallback se)
     const aiResult = await generateResponse(messages, model)

     return NextResponse.json({
        response: aiResult.text,
        model: aiResult.model,
        tokens: aiResult.tokens,
        timeStamp: new Date().toISOString()
     })

    } catch (error) {
       console.error("Chat API Error:", error);

     const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

     return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: errorMessage,
        hint: !process.env.OPENAI_API_KEY
          ? "Set OPENAI_API_KEY in your environment variables for production AI."
          : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    ); 

    }
}

async function generateOpenAIResponse(
  systemPrompt: string,
  messages: ChatMessage[],
  preferredModel?: string
): Promise<AIResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const selectedModel =
    preferredModel && preferredModel.startsWith("gpt")
      ? preferredModel
      : process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return {
    text: completion.choices[0]?.message?.content || "",
    model: completion.model || selectedModel,
    tokens: completion.usage?.total_tokens,
  };
}

async function generateOllamaResponse(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<AIResult> {
    //messages ko combine krenge aur role iss bar user se bdl denge with role as system waise assistant hona chaiye lekin 
    //hum system isisliye bol rhe hai kyonki genAi ke hisab se hum ek order follow krte hai 
    //system  >  developer (optional) >  user  >  assistant
   /*

   system = rules / brain wiring
   user = sawaal
   assistant = pichhle jawaab (memory)
   
   */

   const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages
   ]

   //ab ollama ke liye prompt bnana hoga
   //ollama chatgpt jaise nhi leta promopt mtlb json format mai nhi leta hai prompt woh text leta hai

   const prompt = fullMessages
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join("\n\n")

  const ollamaBaseUrl = (
    process.env.OLLAMA_BASE_URL ||
    process.env.OLLAMA_URL ||
    "http://localhost:11434"
  ).replace(/\/$/, "");
  const ollamaModel = process.env.OLLAMA_MODEL || "codellama:latest";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7, // Controls randomness (0-1)
          max_tokens: 1000, // Maximum response length
          top_p: 0.9, // controls diversity
        },
      }),
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!data.response) {
      throw new Error("No response from AI model");
    }

    return {
      text: data.response.trim(),
      model: ollamaModel,
    };
  } catch (error) {
    console.error("AI generation error:", error);
    throw new Error("Failed to generate AI response");
  }
}

async function generateResponse(
  messages: ChatMessage[],
  preferredModel?: string
): Promise<AIResult> {
    //main ai call krega yeh function 
    //isme hum ai ko prompt denge 
    //system prompt 
    //system Prompt kya krega 
    //yeh Ai ka personality + rules define krega 
    //iske bina 
    //ai will halucinate, kabhi zyada bolega,kabhi random baatein karta
    //basically copilot type behaviour laana hai  

    const systemPrompt = `You are a helpful AI coding assistant. You help developers with:
    - Code explanations and debugging
    - Best practices and architecture advice  
    - Writing clean, efficient code
    -Troubleshooting errors
    - Code reviews and optimizations
    -act like a friend and a coding buddy and teach me all the value things+core concepts don't just fix bugs 

    Always provide clear, practical answers. Use proper code formatting when showing examples.`;

    // 1. Agar OpenAI key di hui hai to OpenAI use karo (Vercel Production ke liye)
    if (process.env.OPENAI_API_KEY) {
      try {
        return await generateOpenAIResponse(systemPrompt, messages, preferredModel);
      } catch (openaiErr) {
        console.error("OpenAI generation failed, falling back to Ollama if configured:", openaiErr);
        if (!process.env.OLLAMA_BASE_URL && !process.env.OLLAMA_URL) {
          throw openaiErr;
        }
      }
    }

    // 2. Local ya custom Ollama instance pe fallback
    return await generateOllamaResponse(systemPrompt, messages);
}

//ek hum enhancePrompt bhi daal skte hai jisse hum ai ki help se user jo prompt dega usko refine kr skte hai  
//usme bhi same hi kaam krna pdegaaa jaise abhi system prompt diya hhai waise hi 
