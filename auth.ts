import NextAuth from "next-auth"
import { db } from "./lib/db"
import authConfig from "./auth.config"
import { getUserById } from "./modules/auth/actions/db-actions"


export const { handlers, signIn, signOut, auth } = NextAuth({
  callbacks: {

    async signIn({ user, account, profile }) {
      // Guard: account must exist
      if (!user || !account) return false

      try {
        // GitHub users can have private email (null).
        // Fall back to a deterministic placeholder so Prisma never gets undefined.
        const resolvedEmail =
          user.email ??
          (profile && "login" in profile
            ? `${(profile as { login: string }).login}@users.noreply.github.com`
            : null)

        if (!resolvedEmail) {
          // Cannot identify user without any email – deny sign-in
          console.error("[AUTH] signIn blocked: no email and no GitHub login in profile")
          return false
        }

        // Look up by email OR by existing OAuth account (handles re-auth without email)
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        })

        if (existingAccount) {
          // Account already linked — update tokens and allow sign-in
          await db.account.update({
            where: { id: existingAccount.id },
            data: {
              refreshToken: account.refresh_token,
              accessToken: account.access_token,
              expiresAt: account.expires_at,
              tokenType: account.token_type,
              scope: account.scope,
              idToken: account.id_token,
            },
          })
          return true
        }

        // No account yet — find user by email
        const existingUser = await db.user.findUnique({
          where: { email: resolvedEmail },
        })

        if (!existingUser) {
          // New User: create user + account together
          const newUser = await db.user.create({
            // @ts-ignore
            data: {
              email: resolvedEmail,
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
            },
          })
          return !!newUser
        } else {
          // Existing User — link this new OAuth account to them
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
          return true
        }
      } catch (error) {
        console.error("SignIn Callback Error:", error)
        return false
      }
    },

    async jwt({ token }) {
      if (!token.sub && !token.email) return token;

      let existingUser = null;
      if (token.sub) {
        existingUser = await getUserById(token.sub);
      }
      if (!existingUser && token.email) {
        existingUser = await db.user.findUnique({
          where: { email: token.email },
        });
      }

      if (!existingUser) return token;

      token.sub = existingUser.id;
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

  ...authConfig
})