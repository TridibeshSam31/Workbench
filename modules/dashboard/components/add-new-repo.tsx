"use client"
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { GithubImport } from "@/modules/Github/components/github-import"

const AddRepo = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="w-full h-full">
      <div
        onClick={() => setIsOpen(true)}
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
            <ArrowDown size={24} className="transition-transform duration-300 group-hover:translate-y-1" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-[#e93f3f]">Open Github Repository</h1>
            <p className="text-sm text-muted-foreground max-w-[220px]">Work with your repositories in our editor</p>
          </div>
        </div>

        <div className="relative overflow-hidden justify-self-end">
          <Image
            src={"/github.svg"}
            alt="Open GitHub repository"
            width={140}
            height={140}
            className="transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </div>

      <GithubImport
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  )

}

export default AddRepo


