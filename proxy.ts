import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Protect only these routes
const PROTECTED_PATHS = [
  "/dashboard",
  "/recipes",
  "/inventory",
  "/profile",
];

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

// THE NEW REQUIRED EXPORT NAME:
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables.");
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (
        name: string,
        value: string,
        options?: Parameters<typeof response.cookies.set>[2]
      ) => {
        response.cookies.set(name, value, options);
      },
    },
  });

  // Refresh session
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const pathname = request.nextUrl.pathname;

  // Public routes
  const isPublic =
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    pathname.startsWith("/api");

  if (isPublic) return response;

  // Protected routes
  const routeIsProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (routeIsProtected && !session) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
