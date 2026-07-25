import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  // español sin prefijo (/frames), inglés bajo /en (/en/frames)
  localePrefix: "as-needed",
})
