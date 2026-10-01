import NextAuth from "next-auth"
import { DEFAULT_LOGIN_REDIRECT, apiAuthPrefix, publicRoutes, authRoutes } from "./routes"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {

    const { nextUrl } = req
    const isLoggedIn = !!req.auth

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);

    const isPublicRoute = publicRoutes.includes(nextUrl.pathname);


    const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
        return null;

    }//If the request is for /api/auth/..., allow it through (NextAuth handles these internally).


    //If the route is a login/register page and the user is already logged in, redirect them to the dashboard (DEFAULT_LOGIN_REDIRECT).
    //If not logged in, allow them to access login/register.
    if (isAuthRoute) {
        if (isLoggedIn) {
            return Response.redirect(new URL(DEFAULT_LOGIN_REDIRECT, req.url))
        }
        return null
    }

    //If the user is not logged in and the route is not public, redirect them to the login page (/auth/sign-in).
    if (!isLoggedIn && !isPublicRoute) {
        return Response.redirect(new URL("/auth/sign-in", nextUrl))
    }

    return null //If none of the above applies, just allow the request.


})

export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"]
}




/*
in route type check what are we actually doing  and whatare the purpose of these methods startswith(),includes() why are we using these ???

const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);

1.startswith()
Purpose: Checks if the current URL path begins with a given string.
Example:
"/api/auth/signin".startsWith("/api/auth") // true
"/api/users".startsWith("/api/auth")       // false

Why here? All NextAuth’s built-in API endpoints start with /api/auth/....
So this lets us quickly identify "Is the request hitting the NextAuth API endpoints?"

2.includes()

const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
const isAuthRoute = authRoutes.includes(nextUrl.pathname);

Purpose: Checks if a value exists in an array.

example
const publicRoutes = ["/", "/about", "/contact"];
publicRoutes.includes("/")        // true
publicRoutes.includes("/profile") // false


Why here?

publicRoutes is a list of pages anyone can see without logging in.
authRoutes is a list of login/signup routes.
So we’re just asking: “Does the current route match one of these lists?”


So basically:

startsWith → prefix check (used when the path is dynamic but always begins the same way).

includes → exact match check (used when you have a finite, predefined set of routes).

*/