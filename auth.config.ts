import Github from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"



export default {
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    providers: [
        Github({
            clientId: process.env.GITHUB_ID || process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET,
            authorization: { params: { scope: "read:user user:email repo" } },
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET,
        })
    ]
} satisfies NextAuthConfig 