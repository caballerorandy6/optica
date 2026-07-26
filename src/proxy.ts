import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { routing } from "./i18n/routing"
import { ADMIN_COOKIE, verifySessionToken } from "./lib/admin-session"

const handleI18n = createMiddleware(routing)

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /admin vive fuera del i18n público y exige sesión (excepto el login)
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next()
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    if (!token || !(await verifySessionToken(token))) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    return NextResponse.next()
  }

  return handleI18n(request)
}

export const config = {
  // todo excepto api, internals y archivos estáticos
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
