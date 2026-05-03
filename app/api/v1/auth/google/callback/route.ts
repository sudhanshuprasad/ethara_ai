import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;       // Google's unique user ID
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
}

/** GET /api/auth/google/callback — exchange code for tokens, upsert user, return JWT */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/v1/auth/google/callback`;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied access
  if (error || !code) {
    return Response.redirect(`${appUrl}/?error=oauth_denied`);
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      return Response.redirect(`${appUrl}/?error=token_exchange_failed`);
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();

    // 2. Fetch user profile from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return Response.redirect(`${appUrl}/?error=userinfo_failed`);
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();

    if (!googleUser.email_verified) {
      return Response.redirect(`${appUrl}/?error=email_not_verified`);
    }

    // 3. Upsert user — find by googleId, then by email, or create new
    let user = await prisma.user.findUnique({
      where: { googleId: googleUser.sub },
    });

    if (!user) {
      // Try to link to existing email account
      user = await prisma.user.findUnique({ where: { email: googleUser.email } });

      if (user) {
        // Link Google to existing email account
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.sub,
            avatarUrl: googleUser.picture,
          },
        });
      } else {
        // Create brand new user
        user = await prisma.user.create({
          data: {
            name: googleUser.name,
            email: googleUser.email,
            googleId: googleUser.sub,
            avatarUrl: googleUser.picture,
          },
        });
      }
    }

    // 4. Issue JWT and redirect to app with token in query param
    //    (frontend reads it once and stores in localStorage)
    const jwt = signToken({ userId: user.id, email: user.email });
    return Response.redirect(`${appUrl}/?token=${jwt}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return Response.redirect(`${appUrl}/?error=server_error`);
  }
}
