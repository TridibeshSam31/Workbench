"use server"
import {currentUser} from "@/modules/auth/actions"
import {db} from "@/lib/db"
import { revalidatePath } from "next/cache";

//jaise hi koi bhi dashboard pr jaaye mai chahta hu ki db mai jo bhi stored ho data uss user ka uss playground se related woh sab  aa jaye so uske liye backend likhenge





export const toggleStarMarked = async(playgroundId:string,isChecked:boolean)=>{
    const user = await currentUser()
    const userId = user?.id
    if(!userId){
        throw new Error("User Id is Required")

    }
    try {
        if (isChecked) {
           await db.starMark.create({
            data:{
                userId:userId!,
                playgroundId,
                isMarked:isChecked
            }
           }) 
        }else{
            await db.starMark.delete({
                where:{
                    userId_playgroundId:{
                        userId,
                        playgroundId:playgroundId
                    }
                }
            })
        }

        revalidatePath("/dashboard");
        return {success:true,isMarked:isChecked}
    } catch (error) {
        console.error("Error updating Problem:",error)
        return {success:false,error:"failed to update problem"}
    }
} 

/* what we did in this toggleStar method is that 
1st was about user authentication 
and then we were dealing with database operations
When starring (isChecked = true)
this creates a new record in the StarMark table 
Link the user to the playground they're starring
When unstarring (isChecked = false):
Deletes the existing star record
Uses a composite key (userId_playgroundId) to find the exact record

and then Cache Revalidation:
Refreshes the dashboard page data (likely using Next.js)
Ensures the UI shows the updated star status immediately


*/


export const getAllPlaygroundForUser = async()=>{
    const user = await currentUser();
    try {
        const playground = await db.playground.findMany({
            where:{
                userId:user?.id,
            },
            include:{
                user:true,
                
                starMarks:{
            where:{
                userId:user?.id!
            },
            select:{
                isMarked:true
            }
           }
            }

        })
        return playground;

    } catch (error) {
        console.log(error)
    }
}

export const createPlayground = async(data:{
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
})=>{
 const user = await currentUser();
 if (!user?.id) {
     throw new Error("Unauthorized - Please sign in");
 }
 const {template,title,description} = data
   try {
     const playground = await db.playground.create({
        data:{
            title:title,
            description:description,
            template:template,
            userId:user.id,
        }

     })
     return playground;
  
   } catch (error) {
    console.log(error)
   }

}

export const deletePlayground = async(id:string)=>{
    const user = await currentUser();
    if (!user?.id) throw new Error("Unauthorized");

    try {
        const playground = await db.playground.findUnique({
            where: { id },
            select: { userId: true },
        });
        if (!playground || playground.userId !== user.id) {
            throw new Error("Unauthorized - You cannot delete this playground");
        }

        await db.playground.delete({
            where:{
                id:id,
            }
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.log(error)
    }
}

export const editProjectById = async(id:string,data:{
    title: string,
    description:string
})=>{
    const user = await currentUser();
    if (!user?.id) throw new Error("Unauthorized");

    try {
        const playground = await db.playground.findUnique({
            where: { id },
            select: { userId: true },
        });
        if (!playground || playground.userId !== user.id) {
            throw new Error("Unauthorized - You cannot edit this playground");
        }

        await db.playground.update({
            where:{
                id:id,
            },
            data:data,
        })
        revalidatePath("/dashboard")
        

    } catch (error) {
       console.log(error) 
    }
}


export const duplicateProjectById = async(id:string)=>{
    const user = await currentUser();
    if (!user?.id) throw new Error("Unauthorized");

    try {
        const originalPlayground = await db.playground.findUnique({
            where:{
                id,
            },
            include: {
                templateFiles: true,
            }
        })
        if(!originalPlayground){
            throw new Error("Original Playground Not Found")
        }
        const duplicatePlayground = await db.playground.create({
            data:{
                title:`${originalPlayground.title} (Copy)`,
                description:originalPlayground.description,
                template:originalPlayground.template,
                userId: user.id,
            }
        })

        if (originalPlayground.templateFiles?.length > 0 && originalPlayground.templateFiles[0].content) {
            await db.templateFile.create({
                data: {
                    playgroundId: duplicatePlayground.id,
                    content: originalPlayground.templateFiles[0].content as any,
                }
            })
        }

        revalidatePath("/dashboard")
        return duplicatePlayground
    } catch (error) {
        console.log(error)
    }
}





    
    