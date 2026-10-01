//here we will create the useWebcontainer custom hook
//we will use this in the playground folder page.tsx where we have used fileExplorer etc custom hooks so that after running the code the user can see the output

import {useState , useEffect , useCallback} from "react"
import {WebContainer} from "@webcontainer/api"
import { TemplateFolder } from "@/modules/playground/lib/path-to-json"


//crating basic ts interface for ts 

interface UseWebContainerProps{
    templateData:TemplateFolder
}

interface UseWebContainerReturn {
    serverUrl:string|null,
    isLoading:boolean,
    error:string|null,
    instance:WebContainer| null, //only 1 instance at a time using webcontainer
    writeFileSync:(path:string,content:string)=>Promise<void>
    destroy:()=>void

}


export const useWebContainer = ({templateData}:UseWebContainerProps) => {
    const [serverUrl,setServerUrl] = useState<string|null>(null)
    const [isLoading , setIsLoading] = useState<boolean>(true)
    const [error,setError] = useState<string|null>(null)
    const [instance , setInstance] = useState<WebContainer | null>(null)

    useEffect(()=>{
        let mounted = true
        async function initializeWebContainer(){
            try {
                const webContainerInstance = await WebContainer.boot()

                if(!mounted) return

                setInstance(webContainerInstance)
                setIsLoading(false)
            } catch (error) {
                console.error("failed to initialize webcontainer:",error)
                if (mounted) {
                    setError(error instanceof Error ? error.message:"Failed to initalize WebContainer")
                    setIsLoading(false)
                }
            }
        }

        initializeWebContainer()

        return ()=>{
            mounted = false
            if (instance) {
                instance.teardown()
            }
        }
    },[])


    const writeFileSync = useCallback(async(path:string,content:string):Promise<void>=>{
        if (!instance) {
            throw new Error('webcontainer Instance Not found')
        }

        try {
            const pathParts = path.split("/")
            const folderPath = pathParts.slice(0,-1).join("/")

            if (folderPath) {
                await instance.fs.mkdir(folderPath, { recursive: true })
            }
            await instance.fs.writeFile(path, content)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed To write file"
            console.error(`failed to write file at ${path}:`,error)
            throw new Error(`Failed to Write File at ${path}:${errorMessage}`)
        }

    },[instance])

    const destroy = useCallback(()=>{
        if (instance) {
            instance.teardown()
            setInstance(null)
            setServerUrl(null)
        }

    },[instance])

    return {serverUrl , isLoading , error , instance , writeFileSync , destroy }
}