import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    const githubId = process.env.GITHUB_ID || process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID;
    const githubSecret = process.env.GITHUB_SECRET || process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;

    return NextResponse.json({
        host: req.headers.get("host"),
        env: {
            has_AUTH_SECRET: !!process.env.AUTH_SECRET,
            has_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
            has_any_secret: !!authSecret,
            secret_length: authSecret?.length ?? 0,
            has_GITHUB_ID: !!process.env.GITHUB_ID,
            has_AUTH_GITHUB_ID: !!process.env.AUTH_GITHUB_ID,
            has_GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
            has_any_github_id: !!githubId,
            github_id_length: githubId?.length ?? 0,
            has_GITHUB_SECRET: !!process.env.GITHUB_SECRET,
            has_AUTH_GITHUB_SECRET: !!process.env.AUTH_GITHUB_SECRET,
            has_GITHUB_CLIENT_SECRET: !!process.env.GITHUB_CLIENT_SECRET,
            has_any_github_secret: !!githubSecret,
            github_secret_length: githubSecret?.length ?? 0,
            has_AUTH_TRUST_HOST: !!process.env.AUTH_TRUST_HOST,
            has_DATABASE_URL: hasDatabaseUrl,
        }
    });
}
