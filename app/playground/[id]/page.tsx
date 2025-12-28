"use client"
//this whole page is for the display feature of the playground that what a user will see on the playground / template that he choose 
//like on the rightmost corner of the page we will see options of save file , save all etc a ai button that will help in ncode suggestion
// a navbar that will display current files like app.jsx etc 
//using monaco editor we will display the starter code of the following templates
//we will integrate webcontainers here also so that will also be visible here
//webcontainers are only visible for the client side no server is required for that 

import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TemplateFileTree } from '@/modules/playground/components/playground-explorer';
import { useFileExplorer } from '@/modules/playground/hooks/useFileExplorer';
import { usePlayground } from '@/modules/playground/hooks/usePlayground';
import { useParams } from 'next/navigation'
import React, { useCallback, useEffect }  from 'react'
import { TemplateFile, TemplateFolder } from '@/modules/playground/lib/path-to-json';
import { Button } from '@/components/ui/button';
import { Bot, FileText, Save, Settings, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import PlaygroundEditor from '@/modules/playground/components/playground-editor';
import { useWebContainer } from '@/modules/webcontainers/hooks/useWebContainer';
import WebContainerPreview from '@/modules/webcontainers/components/webcontainer-preview';

const MainPlaygroundPage = () => {
    const {id} = useParams<{id:string}>();
    const [isPreviewVisible , setIsPreviewVisible] = useState(false)

    const {playgroundData,isLoading,templateData,error,saveTemplateData} = usePlayground(id)
     
    const {activeFileId , closeAllFiles, openFile , openFiles , setTemplateData ,  setPlaygroundId , setActiveFileId,closeFile,handleAddFile,handleAddFolder,handleDeleteFile,handleDeleteFolder,handleRenameFile,handleRenameFolder } = useFileExplorer()

    const {serverUrl , isLoading:containerLoading , error:containerError , instance , writeFileSync} 
     //@ts-ignore
    = useWebContainer({templateData})

    useEffect(()=>{setPlaygroundId(id)},[id,setPlaygroundId])

    useEffect(()=>{
      if (templateData&& !openFiles.length) {
        setTemplateData(templateData)
        
      }
    },[templateData,setTemplateData,openFiles.length])
    //for checking purpose 
    console.log("templateData",templateData)
    console.log("playgroundData",playgroundData)


    //creating wrapper for the methods that we created in useFileExplorer i.e handleAddFile,handleAddFolder etc because they are requiring setTempleteData in everyField hence we will create a wrapper

    const wrappedHandleAddFile = useCallback((newFile:TemplateFile,parentPath:string)=>{
      return handleAddFile(
       newFile,
       parentPath,
       writeFileSync,
       instance,
       saveTemplateData 
      )
    },[handleAddFile,writeFileSync,instance,saveTemplateData])

    //reapper for passing saveTemplateData in addfolder handler

    const wrappeedHandleAddFolder = useCallback((newFolder:TemplateFolder,parentPath:string)=>{
      return handleAddFolder(newFolder,parentPath,instance,saveTemplateData)
    },[handleAddFolder,instance,saveTemplateData])

   const wrappedHandleDeleteFile = useCallback(
    (file: TemplateFile, parentPath: string) => {
      return handleDeleteFile(file, parentPath, saveTemplateData);
    },
    [handleDeleteFile, saveTemplateData]
  );

  const wrappedHandleDeleteFolder = useCallback(
    (folder: TemplateFolder, parentPath: string) => {
      return handleDeleteFolder(folder, parentPath, saveTemplateData);
    },
    [handleDeleteFolder, saveTemplateData]
  );

  const wrappedHandleRenameFile = useCallback(
    (
      file: TemplateFile,
      newFilename: string,
      newExtension: string,
      parentPath: string
    ) => {
      return handleRenameFile(
        file,
        newFilename,
        newExtension,
        parentPath,
        saveTemplateData
      );
    },
    [handleRenameFile, saveTemplateData]
  );

  const wrappedHandleRenameFolder = useCallback(
    (folder: TemplateFolder, newFolderName: string, parentPath: string,newExtension:string) => {
      return handleRenameFolder(
        folder,
        newFolderName,
        parentPath,
        newExtension,
        saveTemplateData
        
      );
    },
    [handleRenameFolder, saveTemplateData]
  );















  //ui for file exploration
   const activeFile = openFiles.find((file)=>file.id === activeFileId)
   const hasUnsavedChanges = openFiles.some((file)=>file.hasUnsavedChanges)
   

   const handleFileSelect = (file:TemplateFile) => {
    openFile(file)
   }
    
   

  return (
        <TooltipProvider>
            <>
            <TemplateFileTree
            data={templateData!}
            onFileSelect={handleFileSelect}
            selectedFile={activeFile}
            title="File Explorer"
            onAddFile={ wrappedHandleAddFile}
            onAddFolder={wrappeedHandleAddFolder}
            onDeleteFolder={wrappedHandleDeleteFolder }
            onRenameFile={wrappedHandleRenameFile}
            onRenameFolder={wrappedHandleRenameFolder}
            
            />
            <SidebarInset>
              <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
                <SidebarTrigger className='-ml-1'/>
                <Separator orientation='vertical' className='mr-2 h-4'/>

                <div className='flex flex-1 items-center gap-2'>
                <div className='flex flex-col flex-1'>
                  <h1 className='text-sm font-medium '>
                    {playgroundData?.title||"code Playground"}
                  </h1>
                  <p className='text-xs text-muted-foreground'>
                    {openFiles.length} Files(s) open
                    {hasUnsavedChanges && " . Unsaved Changes"}
                  </p>

                </div>


                <div className='flex items-center gap-1'>
                  <Tooltip>
                    <TooltipTrigger>
                      <Button size="sm" variant="outline" onClick={() => {}} disabled={!activeFile || !activeFile.hasUnsavedChanges}>
                        <Save className='h-4 w-4'/>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save (Ctrl+S) </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => {}} disabled={!hasUnsavedChanges}>
                        <Save className='h-4 w-4'/> All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save All (Ctrl+Shift+S) </TooltipContent>
                  </Tooltip>

                  <Button variant={"default"} size={"icon"}>
                    <Bot className='size-4' />
                  </Button>
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                    >
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closeAllFiles}>
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>

              </header>
              <div className='h-[calc(100vh-4rem)]'>
                {
                  openFiles.length > 0 ? (
                   <div className='h-full flex flex-col'>
                     <div className='border-b bg-muted/30'>
                     <Tabs value={activeFileId||""} onValueChange={setActiveFileId}>
                      <div className="flex items-center justify-between px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              <span>
                                {file.filename}.{file.fileExtension}
                              </span>
                              {file.hasUnsavedChanges && (
                                <span className="h-2 w-2 rounded-full bg-orange-500" />
                              )}
                              <span
                                className="ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={closeAllFiles}
                          className="h-6 px-2 text-xs"
                        >
                          Close All
                        </Button>
                      )}
                    </div>
                      
                      </Tabs> 
                    
                     </div>
                     <div className='flex-1'>
                       <ResizablePanelGroup direction='horizontal' className='h-full'>
                        <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100}>
                          <PlaygroundEditor 
                          activeFile={activeFile}
                          content={activeFile?.content || ""}
                          onContentChange={()=>{}}
                          
                          
                          />
                        </ResizablePanel>
                        {
                          isPreviewVisible && (
                            <>
                            <ResizableHandle/>
                            <ResizablePanel defaultSize={50} >
                              <WebContainerPreview
                              //@ts-ignore
                               templateData={templateData}
                               instance={instance}
                               writeFileSync = {writeFileSync}
                               isLoading={containerLoading}
                               error={containerError}
                               //@ts-ignore
                               serverUrl={serverUrl}
                               forceResetup={false}
                              
                              />

                            </ResizablePanel>
                            </>
                          )
                        }
                       </ResizablePanelGroup>
                      </div>

                   </div>
                  ) : (
                    <div className='flex flex-col h-full items-center justify-center text-muted-foreground gap-4'>
                      <FileText className='h-16 w-16 text-gray-300'/>
                      <div className='text-center'>
                        <p className='text-lg font-medium'>No Files Open</p>
                        <p className='text-sm text-gray-500'>
                          Select a file from sidebar to start editing
                        </p>

                        
                      </div>

                    </div>
                  )
                }

              </div>
              
            </SidebarInset>



            </>
        </TooltipProvider>
  )
}

export default MainPlaygroundPage



//iss params id se kya hoga ?
/*

The code defines a React component called MainPlaygroundPage that uses the useParams hook from Next.js to extract the id parameter from the URL. When this component is rendered, it will display the text "params : " followed by the value of the id parameter.
next we need to select the template and then convert it to the json format and then we can use it in playground





*/