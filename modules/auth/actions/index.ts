//server actions used here that is we will create a function that we can use in this directly in our frontend component without making an api route 
//for this purpose we will use "use server" directive at the top of the file 
//this will help us to make the codebase look clearner rather thn making api calls for every small task

"use server"

import { auth } from "@/auth"
import { getUserById as _getUserById, getAccountByUserId as _getAccountByUserId } from "./db-actions"

export const getUserById = async (id: string) => {
    return await _getUserById(id);
}

export const getAccountByUserId = async (userId: string, provider?: string) => {
    return await _getAccountByUserId(userId, provider);
}

export const currentUser = async () => {
    const user = await auth()
    return user?.user;
}