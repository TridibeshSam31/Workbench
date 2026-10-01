import Github from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"



const githubClientId =
    process.env.GITHUB_ID ||
    process.env.AUTH_GITHUB_ID ||
    process.env.GITHUB_CLIENT_ID;

const githubClientSecret =
    process.env.GITHUB_SECRET ||
    process.env.AUTH_GITHUB_SECRET ||
    process.env.GITHUB_CLIENT_SECRET;

const googleClientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.AUTH_GOOGLE_ID ||
    process.env.GOOGLE_ID;

const googleClientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.AUTH_GOOGLE_SECRET ||
    process.env.GOOGLE_SECRET;

if (!githubClientId || !githubClientSecret) {
    console.warn("[AUTH CONFIG] GitHub OAuth credentials status:", {
        hasClientId: !!githubClientId,
        hasClientSecret: !!githubClientSecret,
    });
}

export default {
    // trustHost is REQUIRED for Vercel deployments.
    // Vercel uses the x-forwarded-host header to determine the actual URL.
    // Without this, Auth.js v5 defaults to "https://authjs.dev" as the issuer
    // for OAuth state JWTs, causing the "expected: https://authjs.dev" error on callback.
    trustHost: true,

    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    providers: [
        Github({
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            authorization: { params: { scope: "read:user user:email repo" } },
        }),
        Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
        })
    ]
} satisfies NextAuthConfig 