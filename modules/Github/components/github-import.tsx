"use client"

import { useState, useEffect, useTransition } from "react"
import { getGithubUser, searchGithubRepos, getRepoBranches, cloneRepoToPlayground } from "../actions"
import { useRouter } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Github, Search, Star, GitBranch, Loader2, ArrowRight, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RepoItem } from "./browser-repo"

interface GithubImportProps {
    isOpen: boolean
    onClose: () => void
}

export const GithubImport = ({ isOpen, onClose }: GithubImportProps) => {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [repos, setRepos] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedRepo, setSelectedRepo] = useState<any | null>(null)
    const [branches, setBranches] = useState<any[]>([])
    const [selectedBranch, setSelectedBranch] = useState("")
    const [error, setError] = useState<string | null>(null)

    console.log("GithubImport State:", {
        hasRepos: repos.length,
        loading,
        selectedRepo: selectedRepo?.full_name,
        branchCount: branches.length,
        error
    })

    const fetchRepos = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await getGithubUser()
            setRepos(data)
        } catch (error: any) {
            console.error("Error fetching GitHub repos:", error)
            setError(error.message || "Failed to fetch repositories. Please check your GitHub connection.")
            toast.error(error.message || "Failed to fetch repositories")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchRepos()
        }
    }, [isOpen])

    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (!query.trim()) {
            fetchRepos()
            return
        }
        setLoading(true)
        setError(null)
        try {
            const data = await searchGithubRepos(query)
            setRepos(data)
        } catch (error: any) {
            console.error("Error searching GitHub repos:", error)
            setError(error.message || "Failed to search repositories")
            toast.error(error.message || "Failed to search repositories")
        } finally {
            setLoading(false)
        }
    }

    const handleSelectRepo = async (repo: any) => {
        setSelectedRepo(repo)
        setLoading(true)
        setError(null)
        try {
            const branchData = await getRepoBranches(repo.full_name)
            setBranches(branchData)
            setSelectedBranch(repo.default_branch || "main")
        } catch (error: any) {
            console.error("Error fetching branches:", error)
            toast.error("Failed to fetch branches")
            setError("Failed to fetch branches for this repository.")
        } finally {
            setLoading(false)
        }
    }

    const handleImport = async () => {
        if (selectedRepo) {
            startTransition(async () => {
                try {
                    const result = await cloneRepoToPlayground(
                        selectedRepo.full_name,
                        selectedRepo.name,
                        selectedBranch
                    )
                    toast.success("Repository imported successfully!")
                    onClose()
                    router.push(`/playground/${result.playgroundId}`)
                } catch (error) {
                    toast.error("Failed to import repository")
                }
            })
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-[#E93F3F]">
                        <Github className="w-6 h-6" />
                        Import Repository
                    </DialogTitle>
                    <DialogDescription>
                        Select a repository to import into your playground.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive" className="mx-6 mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex-1 flex flex-col overflow-hidden">
                    <Tabs defaultValue="my-repos" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="mx-6 mt-4">
                            <TabsTrigger value="my-repos">My Repositories</TabsTrigger>
                            <TabsTrigger value="search">Search Public</TabsTrigger>
                        </TabsList>

                        <TabsContent value="my-repos" className="flex-1 flex flex-col p-0 m-0 overflow-hidden">
                            <ScrollArea className="flex-1">
                                {loading && repos.length === 0 ? (
                                    <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-[#E93F3F]" /></div>
                                ) : (
                                    <div className="flex flex-col">
                                        {repos.map(repo => (
                                            <RepoItem
                                                key={repo.id}
                                                repo={repo}
                                                isSelected={selectedRepo?.id === repo.id}
                                                onSelect={handleSelectRepo}
                                            />
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="search" className="flex-1 flex flex-col p-0 m-0 overflow-hidden">
                            <div className="p-4 border-b">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search public repositories..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                {loading && repos.length === 0 ? (
                                    <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-[#E93F3F]" /></div>
                                ) : (
                                    <div className="flex flex-col">
                                        {repos.map(repo => (
                                            <RepoItem
                                                key={repo.id}
                                                repo={repo}
                                                isSelected={selectedRepo?.id === repo.id}
                                                onSelect={handleSelectRepo}
                                            />
                                        ))}
                                        {repos.length === 0 && !loading && (
                                            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                                <Search className="w-12 h-12 mb-4 opacity-20" />
                                                <p className="text-sm">Search for awesome public projects to import.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </div>

                {selectedRepo && (
                    <div className="p-6 border-t bg-muted/40 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <GitBranch className="w-3 h-3" /> Select Branch
                            </label>
                            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.name} value={branch.name}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end h-full">
                            <Button
                                onClick={handleImport}
                                disabled={isPending || !selectedBranch}
                                className="bg-[#E93F3F] hover:bg-[#d03636] text-white gap-2"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                Import Repository
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
