import { getTranslations } from "next-intl/server";

import { FrameCard } from "@/components/catalog/frame-card";
import { Link } from "@/i18n/navigation";
import { getFilterOptions, getFrames } from "@/lib/catalog";
import { SITE } from "@/lib/constants";

export default async function Home() {
  const [t, { frames: featured }, { collections }] = await Promise.all([
    getTranslations("Home"),
    getFrames({ featured: true }),
    getFilterOptions(),
  ]);

  const values = [
    { title: t("valueRxTitle"), detail: t("valueRxDetail") },
    { title: t("valueLocalTitle"), detail: t("valueLocalDetail") },
    { title: t("valueBilingualTitle"), detail: t("valueBilingualDetail") },
  ];

  return (
    <main className="flex-1">
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber">
            {t("eyebrow", { city: SITE.city })}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-medium leading-tight tracking-tight sm:text-7xl">
            {t("titleStart")} <em className="text-accent">{t("titleAccent")}</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">{t("sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/frames"
              className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-opacity hover:opacity-90"
            >
              {t("ctaShop")}
            </Link>
            <Link
              href="/frames?featured=1"
              className="rounded-full border border-line px-6 py-3 font-medium transition-colors hover:border-accent"
            >
              {t("ctaBestsellers")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-3xl font-medium">{t("bestsellersTitle")}</h2>
          <Link
            href="/frames?featured=1"
            className="text-sm text-accent underline underline-offset-4"
          >
            {t("viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.slice(0, 8).map((frame) => (
            <FrameCard key={frame.id} frame={frame} />
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white/40 dark:bg-white/5">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-medium">{t("collectionsTitle")}</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/frames?collection=${c.slug}`}
                className="rounded-full border border-line px-5 py-2.5 text-sm transition-colors hover:border-accent hover:text-accent"
              >
                {c.name} <span className="text-muted">({c._count.products})</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3">
        {values.map((v) => (
          <div key={v.title}>
            <h3 className="font-display text-xl font-medium">{v.title}</h3>
            <p className="mt-1 text-sm text-muted">{v.detail}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
