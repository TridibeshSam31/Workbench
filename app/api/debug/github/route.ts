import { NextResponse } from "next/server"
import { currentUser } from "@/modules/auth/actions"
import { getAccountByUserId } from "@/modules/auth/actions"

export async function GET() {
    try {
        const user = await currentUser()

        if (!user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        const account = await getAccountByUserId(user.id!, "github")

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            hasGithubAccount: !!account,
            hasAccessToken: !!account?.accessToken,
            tokenLength: account?.accessToken?.length || 0,
            hasEnvToken: !!process.env.GITHUB_TOKEN,
            envTokenLength: process.env.GITHUB_TOKEN?.length || 0
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
