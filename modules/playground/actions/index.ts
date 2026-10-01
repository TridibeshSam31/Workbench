"use server"

import { db } from "@/lib/db"
import { TemplateFolder } from "../lib/path-to-json"
import { currentUser } from "@/modules/auth/actions"

export const getPlaygroundById = async(id:string)=>{

    try {
      const playground = await db.playground.findUnique({
        where:{id},
        select:{
            title:true,
            templateFiles:{
                select:{
                    content:true
                }
            }
        }
      }) 
      return playground 
    } catch (error) {
        console.log(error)
    }
}

export const SaveUpdatedCode = async(playgroundId:string,data:TemplateFolder)=>{
    const user = await currentUser()
    if(!user?.id) return null
    
    try {
        const playground = await db.playground.findUnique({
            where: { id: playgroundId },
            select: { userId: true }
        })
        if (!playground || playground.userId !== user.id) {
            throw new Error("Unauthorized: You do not own this playground")
        }

        const updatedPlayground = await db.templateFile.upsert({
            where:{
                playgroundId
            },
            update:{
                content:JSON.stringify(data)

            },
            create:{
                playgroundId,
                content:JSON.stringify(data)
            }
        })
        return updatedPlayground
    } catch (error) {
        console.log("saveupdatedCode error:",error)
        return null
    }


}

