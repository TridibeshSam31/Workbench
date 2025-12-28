import {create} from "zustand"
import {toast} from "sonner"

import {TemplateFile,TemplateFolder} from "../lib/path-to-json"
import { generateFileId } from "../lib"


//we will first create a store for that since it's typescript so we will first define our interface/types 
//then we will use that create method that we defined on the top using that create we will create our hook we will get to methods in this set and get method in callback parameters
//now we will use this in any of our component 

interface OpenFile extends TemplateFile {
    id:string, //for uniquely identifying the template files
    hasUnsavedChanges:boolean,
    content:string,
    originalContent:string
}

interface FileExplorerState{
    playgroundId : string,
    templateData: TemplateFolder | null ,
    openFiles: OpenFile[],
    activeFileId:string | null ,
    editorContent: string,

 // setter methods

    setPlaygroundId: (id:string) => void,
    setTemplateData: (data:TemplateFolder | null) => void ,
    setEditorContent: (content:string) => void ,
    setOpenFiles: (files:OpenFile[]) => void ,
    setActiveFileId: (fileId:string | null) => void 


 //Functions

 openFile: (file:TemplateFile) => void 
 closeFile : (fileId:string) => void 
 closeAllFiles: () => void 


 //we will add the filehandling methods that is create new file delte files etc

 //addfile
 handleAddFile:(
    newFile:TemplateFile,
    parentPath:String,
    writeFileSync:(filePath:String,content:String) => Promise<void>,
    instance:any,
    saveTemplateData:(data:TemplateFolder) => Promise<void>
 ) => Promise<void>;

 //addfolder function defining 

 handleAddFolder:(
    newFolder:TemplateFolder,
    parentPath:String,
    instance:any,
    saveTemplateData:(data:TemplateFolder) => Promise<void>
 ) => Promise<void>

 //delete file function defining

 handleDeleteFile:(
    file:TemplateFile,
    parentPath:String,
    saveTemplateData:(data:TemplateFolder) => Promise<void>
 ) => Promise<void>

 //deelte folder
 handleDeleteFolder:(
    folder:TemplateFolder,
    parentPath:String,
    saveTemplateData:(data:TemplateFolder) => Promise<void>
 ) => Promise<void>

 //renaaming of file
 handleRenameFile:(
    file: TemplateFile,
    newFilename: String,
    newExtension:String,
    parentPath:String,
    saveTemplateData:(data:TemplateFolder) => Promise<void>


 ) => Promise<void>

 
 //renaming of folder
 handleRenameFolder:(
    folder:TemplateFolder,
    newFoldername:String,
    newExtension:String,
    parentPath:String,
    saveTemplateData:(data:TemplateFolder) => Promise<void>
 ) => Promise<void>

 //updateFileContent

 updateFileContent:(fileId:String,content:String) => void




}

//using create method we will create our hook now 
//@ts-ignore
export const useFileExplorer = create<FileExplorerState>((set,get)=>({
    templateData : null ,
    playgroundId: "",
    openFiles:[] satisfies OpenFile[],
    activieField:null,
    editorContent: "",

    setTemplateData: (data) => set({templateData:data}),
    setPlaygroundId(id){
        set({playgroundId:id})
    },
    setEditorContent: (content) => set({editorContent:content}),
    setOpenFiles: (files) => set({openFiles:files}),
    setActiveFileId(fileId) {
        set({activeFileId:fileId})
    },

    openFile: (file)=>{
        //TO OPEN THE FILE WE NEED ??
        //fileId
        //openFiles
        //check existingfile
        //whether the fas has unsavedchanges or not that  will be in boolean form hasUnchangedChanges:false
        //save the current changes etc 

        const fileId = generateFileId(file,get().templateData!)
        const {openFiles} = get()
        const existingFile = openFiles.find((f)=>f.id === fileId)

        if (existingFile) {
            set({activeFileId:fileId , editorContent:existingFile.content})
            return
        }

        const newOpenFile:OpenFile = {
            ...file,
            id: fileId,
            hasUnsavedChanges: false ,
            content: file.content || "",
            originalContent: file.content || ""
        }

        set((state)=>({
            openFiles : [...state.openFiles , newOpenFile],
            activeFileId : fileId,
            editorContent:file.content || "" , 
        }))

        closeFile:(fileId : any)=>{
            const {openFiles , activeFileId} = get()
            const newFiles = openFiles.filter((f) => f.id !== fileId )

            //similar to vs code when we will close when file the tab should automatically switch to another tab for that writing the logic

            let newActiveFileId = activeFileId
            let newEditorContent = get().editorContent

            if (activeFileId === fileId) {
                if (newFiles.length > 0) {
                    const lastFile = newFiles[newFiles.length -1]
                    newActiveFileId = lastFile.id
                    newEditorContent = lastFile.content
                }else{
                    newActiveFileId = null 
                    newEditorContent = ""
                }
            }

            set({
                openFiles:newFiles,
                activeFileId:newActiveFileId,
                editorContent:newEditorContent
            })

        }


        closeAllFiles:() => {
            set({
                openFiles:[],
                activeFileId:null,
                editorContent:""
            })
        }
        
        
        
    },


    //now we will be writing all the functions that we have defined above i.e handleAddFile , handleDeleteFile , handleAddFolder etc
    
    //our target is that when we add a new file then it should add the file in the current template and after that it should sync with our current template 
    handleAddFile:async(newFile,parentPath,writeFileSync,instance,saveTemplateData)=>{
      
        //get the templateData
        const {templateData} = get()

        if (!templateData) {
            return
        }

        try {
            const updateTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder
            const pathParts = parentPath.split("/")
            //what does it do l;ike if we have our path like src/components/ui then it will split it into 
            // ["src","components","ui"] this is our pathparts

            let currentFolder = updateTemplateData

            for(const part of pathParts){
                if (part) {
                    const nextFolder = currentFolder.items.find(
                        (item) => "folderName" in item && item.folderName === part
                    ) as TemplateFolder
                    if (nextFolder) {
                        currentFolder = nextFolder
                    }
                }
            }

            //push the newfile in the currentfolder 
            currentFolder.items.push(newFile)
            set({templateData:updateTemplateData})
            toast.success(`created file: ${newFile.filename}.${newFile.fileExtension}`)

            //save the new structure

            await saveTemplateData(updatedTemplateData);

            //sync with web container 
            if (writeFileSync) {
         const filePath = parentPath
          ? `${parentPath}/${newFile.filename}.${newFile.fileExtension}`
          : `${newFile.filename}.${newFile.fileExtension}`;
        await writeFileSync(filePath, newFile.content || "");
         }

          get().openFile(newFile);


        } catch (error) {
            console.error("Error adding file",error)
            toast.error("Failed to create file")
        }

    },

    handleAddFolder:async(newFolder,parentPath,instance,saveTemplateData) => {
        const {templateData} = get()

        if (!templateData) {
            return
        }

        try {
            const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder
            const pathParts = parentPath.split("/")

            let currentFolder = updatedTemplateData

            for(const part of pathParts){
                if (part) {
                    const nextFolder = currentFolder.items.find(
                        (item) => "folderName" in item && item.folderName === part
                    ) as TemplateFolder

                    if (nextFolder) {
                        currentFolder = nextFolder
                    }



                    
                }

                currentFolder.items.push(newFolder);
               set({ templateData: updatedTemplateData });
               toast.success(`Created folder: ${newFolder.folderName}`);
               

                // Use the passed saveTemplateData function
              await saveTemplateData(updatedTemplateData);

             // Sync with web container
             if (instance && instance.fs) {
              const folderPath = parentPath
               ? `${parentPath}/${newFolder.folderName}`
               : newFolder.folderName;
             await instance.fs.mkdir(folderPath, { recursive: true });
             }

            }
            
        } catch (error) {
         console.error("Error adding folder:", error);
         toast.error("Failed to create folder");
        }

    },


    handleDeleteFile:async (file,parentpath,saveTemplateData) => {
        const {templateData,openFiles} = get()

        if (!templateData) {
            return
            
        }

        try {
         const updatedTemplateData = JSON.parse(JSON.stringify(templateData)) as TemplateFolder
         
         const pathParts = parentpath.split("/")
         let currentFolder = updatedTemplateData

         for(const part of pathParts){
            if (part) {
                const nextFolder = currentFolder.items.find((item) => "folderName" in item && item.folderName  === part) as TemplateFolder

                 if (nextFolder) {
                    currentFolder = nextFolder
                
                }
            }

            currentFolder.items = currentFolder.items.filter(
         (item) =>
          !("filename" in item) ||
          item.filename !== file.filename ||
          item.fileExtension !== file.fileExtension
         );


         // Find and close the file if it's open
         // Use the same ID generation logic as in openFile
         const fileId = generateFileId(file, templateData);
         const openFile = openFiles.find((f) => f.id === fileId);
      
         if (openFile) {
          // Close the file using the closeFile method
          get().closeFile(fileId);
         }

         set({ templateData: updatedTemplateData });

         // Use the passed saveTemplateData function
         await saveTemplateData(updatedTemplateData);
         toast.success(`Deleted file: ${file.filename}.${file.fileExtension}`);

           
         }
        } catch (error) {
         console.error("Error adding folder:", error);
         toast.error("Failed to create folder");
        }

    },

    updateFileContent: (fileId, content) => {
    set((state) => ({
      openFiles: state.openFiles.map((file) =>
        file.id === fileId
          ? {
              ...file,
              content,
              hasUnsavedChanges: content !== file.originalContent,
            }
          : file
      ),
      editorContent:
        fileId === state.activeFileId ? content : state.editorContent,
    }));
  },






}))