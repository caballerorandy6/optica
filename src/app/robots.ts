import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Las combinaciones de filtros del catálogo (/frames?color=…&page=…) hacían que los
      // robots renderizaran cientos de variantes; las monturas ya están en el sitemap
      disallow: [
        "/admin",
        "/api/",
        "/cart",
        "/checkout/",
        "/es/cart",
        "/es/checkout/",
        "/frames?",
        "/es/frames?",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
