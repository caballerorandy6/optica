import createMiddleware from "next-intl/middleware"

import { routing } from "./i18n/routing"

export default createMiddleware(routing)

export const config = {
  // todo excepto api, internals y archivos estáticos
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
