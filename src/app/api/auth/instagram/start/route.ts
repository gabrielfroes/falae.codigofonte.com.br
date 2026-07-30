import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { buildAuthorizationUrl } from "@/lib/instagram/oauth";

const STATE_COOKIE = "falae_oauth_state";

export async function GET() {
  await requireUser();

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  redirect(buildAuthorizationUrl(state));
}
