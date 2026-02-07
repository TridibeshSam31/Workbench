import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "./lib/db"
import authConfig from "./auth.config"
import { getUserById, getAccountByUserId } from "./modules/auth/actions/db-actions"


export const { handlers, signIn, signOut, auth } = NextAuth({
  callbacks: {
    async signIn({ user, account }) {
      if (!user || !account) return false

      try {
        const existingUser = await db.user.findUnique({
          where: {
            email: user.email ?? undefined,
          }
        })

        if (!existingUser) {
          // New User
          const newUser = await db.user.create({
            // @ts-ignore
            data: {
              email: user.email ?? "",
              name: user.name,
              image: user.image,
              accounts: {
                // @ts-ignore
                create: {
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refreshToken: account.refresh_token,
                  accessToken: account.access_token,
                  expiresAt: account.expires_at,
                  tokenType: account.token_type,
                  scope: account.scope,
                  idToken: account.id_token,
                  sessionState: account.session_state,
                },
              },
            }
          });
          return !!newUser
        } else {
          // Existing User - check for account
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            }
          })

          if (!existingAccount) {
            // Link new account to existing user
            await db.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refreshToken: account.refresh_token,
                accessToken: account.access_token,
                expiresAt: account.expires_at,
                tokenType: account.token_type,
                scope: account.scope,
                idToken: account.id_token,
                // @ts-ignore
                sessionState: account.session_state,
              },
            })
          } else {
            // Update existing account tokens
            await db.account.update({
              where: { id: existingAccount.id },
              data: {
                refreshToken: account.refresh_token,
                accessToken: account.access_token,
                expiresAt: account.expires_at,
                tokenType: account.token_type,
                scope: account.scope,
                idToken: account.id_token,
              }
            })
          }
          return true
        }
      } catch (error) {
        console.error("SignIn Callback Error:", error)
        return false
      }
    },
    async jwt({ token }) {
      if (!token.sub) return token;
      const existingUser = await getUserById(token.sub)

      if (!existingUser) return token;

      const exisitingAccount = await getAccountByUserId(existingUser.id);

      token.name = existingUser.name;
      token.email = existingUser.email;
      token.role = existingUser.role;

      return token;

    },
    async session({ session, token }) {
      // Attach the user ID from the token to the session
      if (token.sub && session.user) {
        session.user.id = token.sub
      }

      if (token.sub && session.user) {
        session.user.role = token.role
      }

      return session;
    },

  },

  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig
})