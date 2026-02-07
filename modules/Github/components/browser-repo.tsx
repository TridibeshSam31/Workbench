"use client"

import { Star } from "lucide-react"

interface RepoItemProps {
    repo: any
    isSelected: boolean
    onSelect: (repo: any) => void
}

export const RepoItem = ({ repo, isSelected, onSelect }: RepoItemProps) => {
    return (
        <div
            onClick={() => {
                console.log("RepoItem clicked:", repo.full_name)
                onSelect(repo)
            }}
            className={`p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 flex items-center justify-between ${isSelected ? 'bg-muted border-l-4 border-l-[#E93F3F]' : ''
                }`}
        >
            <div className="flex flex-col gap-1">
                <h3 className="font-medium text-sm">{repo.full_name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                    {repo.description || "No description provided"}
                </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <Star className="w-3 h-3" /> {repo.stargazers_count}
                </div>
                {repo.language && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary">
                        {repo.language}
                    </span>
                )}
            </div>
        </div>
    )
}
