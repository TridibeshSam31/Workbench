
"use client";


 

import { Button } from "@/components/ui/button"
// import { createPlayground } from "@/features/playground/actions";
import { Plus } from 'lucide-react'
import Image from "next/image"
import { useRouter } from "next/navigation";
import { useState } from "react"
import { toast } from "sonner";
import TemplateSelectingModel from "./template-selecting-model";
import { createPlayground } from "../actions";

const AddNewButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate,setSeletedTemplate] = useState<{
    title:string;
    template:"REACT"|"NEXTJS"|"EXPRESS"|"VUE"|"HONO"|"ANGULAR";
    description?:string;
  

  }| null>(null);

  const router = useRouter();

  const handleSubmit = async (data:{
    title:string;
    template:"REACT"|"NEXTJS"|"EXPRESS"|"VUE"|"HONO"|"ANGULAR";
    description?:string;

  })=>{
    setSeletedTemplate(data);

    const res = await createPlayground(data)
    toast.success("playground created successfully")
    setIsModalOpen(false)
    router.push(`/playground/${res?.id}`)




  }

  return (
    <div className="w-full h-full">
      <div
        onClick={() => setIsModalOpen(true)}
        className="group px-6 py-6 grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center justify-between gap-4 border rounded-xl bg-card hover:bg-card/80 cursor-pointer 
        transition-all duration-300 ease-in-out
        hover:border-[#E93F3F] hover:scale-[1.02]
        shadow-sm hover:shadow-[0_10px_30px_rgba(233,63,63,0.15)] h-full"
      >
        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          <Button
            variant={"outline"}
            className="flex justify-center items-center bg-white dark:bg-zinc-900 group-hover:bg-[#fff8f8] dark:group-hover:bg-zinc-800 group-hover:border-[#E93F3F] group-hover:text-[#E93F3F] transition-colors duration-300"
            size={"icon"}
          >
            <Plus size={24} className="transition-transform duration-300 group-hover:rotate-90" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">Add New</h1>
            <p className="text-sm text-muted-foreground max-w-[220px]">Create a new playground</p>
          </div>
        </div>

        <div className="relative overflow-hidden justify-self-end">
          <Image
            src={"/add-new.svg"}
            alt="Create new playground"
            width={140}
            height={140}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <TemplateSelectingModel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )

}

export default AddNewButton
