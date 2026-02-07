"use server"

import { Octokit } from "octokit"
import { getAccountByUserId } from "@/modules/auth/actions"
import { currentUser } from "@/modules/auth/actions"
import { TemplateFolder } from "@/modules/playground/lib/path-to-json"
import { db } from "@/lib/db"

/**
 * Helper function to get authenticated Octokit instance
 */
async function getAuthenticatedOctokit() {
  const user = await currentUser()

  if (!user) {
    throw new Error("Unauthorized - Please sign in")
  }

  // Try to get token from linked GitHub account first
  const account = await getAccountByUserId(user.id!, "github")
  let token = account?.accessToken

  // Fallback to environment variable
  if (!token) {
    token = process.env.GITHUB_TOKEN
  }

  if (!token) {
    throw new Error(
      "GitHub authentication failed. Please link your GitHub account or configure GITHUB_TOKEN in environment variables."
    )
  }

  // Validate token by checking if it's not empty
  if (token.trim().length === 0) {
    throw new Error("GitHub token is empty")
  }

  return new Octokit({
    auth: token,
    userAgent: 'VibeCode-Editor/1.0.0'
  })
}

export async function getGithubUser() {
  try {
    const octokit = await getAuthenticatedOctokit()

    // First, verify the token by getting authenticated user info
    const { data: authUser } = await octokit.rest.users.getAuthenticated()

    console.log("Authenticated GitHub user:", authUser.login)

    // Then fetch repositories
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      visibility: "all",
      affiliation: "owner,collaborator,organization_member",
      per_page: 100,
      sort: "updated",
      sort_direction: "desc" as any // Type fix for octokit
    })

    console.log(`Found ${data.length} repositories`)
    return data
  } catch (error: any) {
    console.error("Error fetching GitHub repos:", error)

    // Provide more specific error messages
    if (error.status === 401) {
      throw new Error("GitHub token is invalid or expired. Please reconnect your GitHub account.")
    } else if (error.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.")
    } else if (error.message) {
      throw new Error(`GitHub API error: ${error.message}`)
    } else {
      throw new Error("Failed to fetch GitHub repositories")
    }
  }
}

export async function importGithubRepo(repoFullName: string) {
  try {
    const user = await currentUser()
    if (!user) {
      throw new Error("Unauthorized")
    }

    const octokit = await getAuthenticatedOctokit()
    const [owner, repo] = repoFullName.split("/")

    if (!owner || !repo) {
      throw new Error("Invalid repository name format. Expected: owner/repo")
    }

    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo
    })

    const { data: contents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: ""
    })

    return { repoData, contents }
  } catch (error: any) {
    console.error("Error importing GitHub repo:", error)

    if (error.status === 404) {
      throw new Error("Repository not found or you don't have access to it")
    } else if (error.message) {
      throw new Error(`Failed to import repository: ${error.message}`)
    } else {
      throw new Error("Failed to import repository")
    }
  }
}

export async function cloneRepoToPlayground(
  repoFullName: string,
  playgroundTitle: string,
  branch: string = "main"
) {
  const user = await currentUser()
  if (!user) throw new Error("User not authenticated")

  const octokit = await getAuthenticatedOctokit()
  const [owner, repo] = repoFullName.split("/")

  if (!owner || !repo) {
    throw new Error("Invalid repository format")
  }

  try {
    // Get repository data
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo
    })

    // Get default branch
    const defaultBranch = repoData.default_branch || branch

    // Get tree structure recursively
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "true"
    })

    // Ignore patterns
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

    const shouldIgnore = (path: string) => {
      return ignorePatterns.some((pattern) => pattern.test(path))
    }

    // Build folder structure
    const templateStructure: TemplateFolder = {
      folderName: repo,
      items: []
    }

    // Process tree items
    const filePromises = tree.tree
      .filter(item => item.type === "blob" && !shouldIgnore(item.path!))
      .map(async (item) => {
        if (!item.path) return null

        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: item.path,
            ref: defaultBranch
          })

          if ('content' in fileData && fileData.content) {
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

    const fileContents = await Promise.all(filePromises)
    const files = fileContents.filter(Boolean) as { path: string, content: string }[]

    // Build nested folder structure
    files.forEach(file => {
      const pathParts = file.path.split("/")
      const fileName = pathParts.pop()!
      let currentLevel = templateStructure.items

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

    // Create playground in database
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
  } catch (error: any) {
    console.error("Error cloning repo:", error)

    if (error.status === 404) {
      throw new Error(`Repository "${repoFullName}" not found or you don't have access`)
    } else if (error.message) {
      throw new Error(`Failed to clone repository: ${error.message}`)
    } else {
      throw new Error("Failed to clone repository")
    }
  }
}

export async function getRepoBranches(repoFullName: string) {
  try {
    const user = await currentUser()
    if (!user) throw new Error("User not authenticated")

    const octokit = await getAuthenticatedOctokit()
    const [owner, repo] = repoFullName.split("/")

    const { data: branches } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100
    })

    return branches
  } catch (error: any) {
    console.error("Error fetching branches:", error)
    throw new Error(error.message || "Failed to fetch repository branches")
  }
}

export async function searchGithubRepos(query: string, language?: string) {
  try {
    const user = await currentUser()
    if (!user) throw new Error("User not authenticated")

    const octokit = await getAuthenticatedOctokit()

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
  } catch (error: any) {
    console.error("Error searching GitHub repos:", error)
    throw new Error(error.message || "Failed to search repositories")
  }
}
