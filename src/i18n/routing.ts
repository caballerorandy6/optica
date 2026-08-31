import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  // inglés sin prefijo (/frames), español bajo /es (/es/frames)
  localePrefix: "as-needed",
})
