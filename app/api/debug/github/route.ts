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



/**
 * 
 * 
 * 
 * I created this folder because the earlier integration process was somehow wrong because I was using acess tokens instead of github token not talking about oAuth secreat tokens 
 * the access tokens are of no use for integrating we have to generate the token masnually by going to developer settings on github so that we could get all the user information like how many repos are there , repos name 
 * etc on a single api so we need to create that 
 * 
 *so what changes are made ???
 replaced the github server actions , accesss.token with process.env.github / seperate github tokens 
 added better error handlings by adding logs 
 */
