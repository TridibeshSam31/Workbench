//we are going to add server actions here for github integrattion like commit,push,pull,cole etc
//we will not be writing apis here we will create server actions methods here that will be light for the whole applications

"use server"


//the first thing we have to do is to setup octokit and then we will fetch the user from the github 
//we have to setup the environment and for that we have to check the repo that will be opening here will be containiong the temoplate i.e react , nextjs ,vue, angular , etc

import { Octokit} from "octokit"
import { getAccountByUserId } from "@/modules/auth/actions"
import { currentUser } from "@/modules/auth/actions"

export async function getGithubUser(){
    const user = await currentUser()

    if(!user){
        throw new Error("Unauthorized")
    }

    const account = await getAccountByUserId(user.id!)

    if(!account || !account.accessToken){
        throw new Error("Github account not linked")
    }


    //since we have added the github Oauth setup so we have made this easier otherwise we have to generater the octokit token and then use it in tthe octokit
    
    const octokit = new Octokit({auth:account.accessToken})
    //from octokit we will get the data of the user and OCtokit provides us the method to get the user data

    const {data} = await octokit.rest.repos.listForAuthenticatedUser({
        visibility:"all",
        affiliation:"owner,collaborator,organization_member",
        per_page:100
    })
    console.log("Github Repos:",data)

    return data
}

//function for import the repo from github 
//after getting the repo we again have to write recursive functions to get the files and folder from the repo asnd the repo must match the template structure

export async function importGithubRepo(repoFullName:string){
    const user = await currentUser()
    if(!user){
        throw new Error("Unauthorized")
    }
    const account = await getAccountByUserId(user.id!)
    if(!account || !account.accessToken){
        throw new Error("Github account not linked")
    }

    const octokit = new Octokit({auth:account.accessToken})

    //https://github.com/TridibeshSam31/Vibe-Code-Editor this is the repo link and we can see that there is my github username and then the reponame so we have to split them 
    
    const [owner,repo] = repoFullName.split("/")
    const {data:repoData} = await octokit.rest.repos.get({
        owner,
        repo
    })

    const {data:contents} = await octokit.rest.repos.getContent({
        owner,
        repo,
        path:""
    })

    //console.log("Repo Data:",repoData)
    // console.log("Contents:",contents)

    return {repoData,contents}
    


}


//now we will open tjhe repo accourding to our template structure that will require recursive functions to get the files and folders

export async function cloneRepoToPlayground(repoFullName:string,playgroundTitle:string){
 const user = await currentUser()
  if (!user) throw new Error("User not authenticated")

  const account = await getAccountByUserId(user.id!)
  const octokit = new Octokit({ auth: account.accessToken })

  const [owner, repo] = repoFullName.split("/")

}

