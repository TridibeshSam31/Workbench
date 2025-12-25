//server actions used here that is we will create a function that we can use in this directly in our frontend component without making an api route 
//for this purpose we will use "use server" directive at the top of the file 
//this will help us to make the codebase look clearner rather thn making api calls for every small task

"use server"

import { db } from "@/lib/db"
import {auth} from "@/auth"

export const getUserById = async(id:string)=>{
   try {
     const user = await db.user.findUnique({
         where:{id},
         include:{
             accounts:true,
         }
     })
     return user
   } catch (error) {
    console.log(error)
    return null
   }
} 


export const getAccountByUserId = async(userId:string)=>{
    try {
        const account = await db.account.findFirst({
            where:{
                userId,
            }
        })
        return account
    } catch (error) {
        console.log(error)
        return null
    }
}


export const currentUser = async()=>{
    const user = await auth()
    return user?.user;
}