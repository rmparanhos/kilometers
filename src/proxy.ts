import { withAuth } from "next-auth/middleware";

// next-auth's withAuth returns a NextMiddleware compatible handler.
// In Next.js 16, the file must be named `proxy.ts` and the export `proxy`.
export const proxy = withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/activities/:path*", "/equipment/:path*"],
};
