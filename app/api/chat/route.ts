//end point for chat messages 
//what is the purpose of this end Point 
//chat based Ai responses deta hai (jaise Chatgpt)
//Local Ai model (ollama+codelamma) se connection
//conversation memory (history) ko handle krta hai 
//Frontend → API → AI Model → Response → Frontend



import { NextResponse,NextRequest } from "next/server"


interface ChatMessage{
    role:"user" | "assistant" ,
    content:string
}

interface ChatRequest{
    message:string
    history:ChatMessage[]
}

export async function POST(req:NextRequest){
    try {
        const body:ChatRequest = await req.json()
        const {message,history = []} = body //destructuring the message and history from the body

        //validation of the input 'message'
        if (!message||typeof message !== "string"){
            return NextResponse.json({error:"Message Must be a string"}, {status:400})

        } 
            
        
    } catch (error) {
        
    }
}