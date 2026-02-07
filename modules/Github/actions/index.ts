//we are going to add server actions here for github integrattion like commit,push,pull,cole etc
//we will not be writing apis here we will create server actions methods here that will be light for the whole applications

"use server"


//the first thing we have to do is to setup octokit and then we will fetch the user from the github 
//we have to setup the environment and for that we have to check the repo that will be opening here will be containiong the temoplate i.e react , nextjs ,vue, angular , etc

import { Octokit } from "octokit"
import { getAccountByUserId } from "@/modules/auth/actions"
import { currentUser } from "@/modules/auth/actions"
import { TemplateFolder } from "@/modules/playground/lib/path-to-json"
import { db } from "@/lib/db"

export async function getGithubUser() {
  const user = await currentUser()

  if (!user) {
    throw new Error("Unauthorized")
  }

  const account = await getAccountByUserId(user.id!, "github")
  const token = account?.accessToken || process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error("Github account not linked and no GITHUB_TOKEN provided")
  }

  const octokit = new Octokit({ auth: token })
  //from octokit we will get the data of the user and OCtokit provides us the method to get the user data

  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    visibility: "all",
    affiliation: "owner,collaborator,organization_member",
    per_page: 100
  })
  console.log("Github Repos:", data)

  return data
}

//function for import the repo from github 
//after getting the repo we again have to write recursive functions to get the files and folder from the repo asnd the repo must match the template structure

export async function importGithubRepo(repoFullName: string) {
  const user = await currentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  const account = await getAccountByUserId(user.id!, "github")
  const token = account?.accessToken || process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error("Github account not linked and no GITHUB_TOKEN provided")
  }

  const octokit = new Octokit({ auth: token })

  //https://github.com/TridibeshSam31/Vibe-Code-Editor this is the repo link and we can see that there is my github username and then the reponame so we have to split them 

  const [owner, repo] = repoFullName.split("/")
  const { data: repoData } = await octokit.rest.repos.get({
    owner,
    repo
  })

  const { data: contents } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: ""
  })

  //console.log("Repo Data:",repoData)
  // console.log("Contents:",contents)

  return { repoData, contents }



}


//now we will open tjhe repo accourding to our template structure that will require recursive functions to get the files and folders

export async function cloneRepoToPlayground(repoFullName: string, playgroundTitle: string, branch: string = "main") {
  const user = await currentUser()
  if (!user) throw new Error("User not authenticated")

  const account = await getAccountByUserId(user.id!, "github")
  const token = account?.accessToken || process.env.GITHUB_TOKEN
  const octokit = new Octokit({ auth: token })

  const [owner, repo] = repoFullName.split("/")

  try {
    //get the repo data
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo
    })

    //get the default branch 
    const defaultBranch = repoData.default_branch || branch

    //get tree structure recursiverly
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "true"
    })

    //during the import the files should not clash with vibecode starters file for that we have to ignore some files
    const ignorePatterns = [
      /^\.git\//,
      /^node_modules\//,
      /^\.env/,
      /\.log$/,
      /^dist\//,
      /^build\//,
      /^\.cache\//,
      /^coverage\//,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/
    ]

    //function to check if the file should be ignored
    const shouldIgnore = (path: string) => {
      return ignorePatterns.some((pattern) => pattern.test(path))
    }

    //build folder structure
    const templateStructure: TemplateFolder = {
      folderName: repo,
      items: []
    }

    //process tree items
    const filePromises = tree.tree.filter(item => item.type === "blob" && !shouldIgnore(item.path!)).map(async (item) => {
      if (!item.path) return null

      try {
        //get file content
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
          ref: defaultBranch
        })
        if ('content' in fileData && fileData.content) {
          //decode to base64
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
          return {
            path: item.path,
            content
          }
        }
      } catch (error) {
        console.error(`Failed to fetch content for ${item.path}:`, error)
        return null
      }
      return null
    })

    //build nested folder structure from file paths
    const fileContents = await Promise.all(filePromises)
    const files = fileContents.filter(Boolean) as { path: string, content: string }[]

    files.forEach(file => {
      const pathParts = file.path.split("/")
      const fileName = pathParts.pop()!

      let currentLevel = templateStructure.items

      //create folder Structure
      pathParts.forEach((part) => {
        let folder = currentLevel.find(
          (item): item is TemplateFolder => 'folderName' in item && item.folderName === part
        )

        if (!folder) {
          folder = {
            folderName: part,
            items: []
          }
          currentLevel.push(folder)
        }
        currentLevel = folder.items
      })

      // Add file
      const lastDotIndex = fileName.lastIndexOf('.')
      const name = lastDotIndex === -1 ? fileName : fileName.substring(0, lastDotIndex)
      const extension = lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex + 1)

      currentLevel.push({
        filename: name,
        fileExtension: extension,
        content: file.content
      })
    })

    // Determine template type
    let templateType: "REACT" | "NEXTJS" | "VUE" | "ANGULAR" | "EXPRESS" | "HONO" = "REACT"
    const packageJsonFile = files.find(f => f.path === "package.json")
    if (packageJsonFile) {
      try {
        const packageJson = JSON.parse(packageJsonFile.content)
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
        if (dependencies["next"]) templateType = "NEXTJS"
        else if (dependencies["vue"]) templateType = "VUE"
        else if (dependencies["@angular/core"]) templateType = "ANGULAR"
        else if (dependencies["express"]) templateType = "EXPRESS"
        else if (dependencies["hono"]) templateType = "HONO"
      } catch (error) {
        console.error("Error parsing package.json:", error)
      }
    }

    //create playground in db
    const playground = await db.playground.create({
      data: {
        title: playgroundTitle,
        template: templateType,
        userId: user.id!,
        description: `Imported from ${repoFullName} repository`
      }
    })

    await db.templateFile.create({
      data: {
        playgroundId: playground.id,
        content: JSON.stringify(templateStructure)
      }
    })

    return {
      playgroundId: playground.id,
      structure: templateStructure,
      templateType
    }
  } catch (error) {
    console.error("Error cloning repo:", error)
    throw new Error("Failed to clone repository")
  }
}


export async function getRepoBranches(repoFullName: string) {
  const user = await currentUser()
  if (!user) throw new Error("User not authenticated")

  const account = await getAccountByUserId(user.id!, "github")
  const token = account?.accessToken || process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error("Github account not linked and no GITHUB_TOKEN provided")
  }

  const octokit = new Octokit({ auth: token })
  const [owner, repo] = repoFullName.split("/")

  const { data: branches } = await octokit.rest.repos.listBranches({
    owner,
    repo,
    per_page: 100
  })

  return branches
}

/*
  Search public GitHub repositories
*/

export async function searchGithubRepos(query: string, language?: string) {
  const user = await currentUser()
  if (!user) throw new Error("User not authenticated")

  const account = await getAccountByUserId(user.id!, "github")
  const token = account?.accessToken || process.env.GITHUB_TOKEN

  if (!token) {
    throw new Error("Github account not linked and no GITHUB_TOKEN provided")
  }

  const octokit = new Octokit({ auth: token })

  let searchQuery = query
  if (language) {
    searchQuery += ` language:${language}`
  }

  const { data } = await octokit.rest.search.repos({
    q: searchQuery,
    sort: 'stars',
    order: 'desc',
    per_page: 30
  })

  return data.items
}
