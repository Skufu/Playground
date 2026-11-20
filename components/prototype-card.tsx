import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PrototypeMeta } from "@/lib/prototypes";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

export function PrototypeCard({ prototype }: { prototype: PrototypeMeta }) {
  const { slug, title, summary, hue, date, thumbnail } = prototype;

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[border-color,box-shadow] duration-150 focus-within:border-border-strong focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent hover:border-border-strong hover:shadow-[var(--shadow-card)]">
      <div
        className="thumb relative aspect-[16/10] w-full overflow-hidden border-b border-border"
        style={{ "--hue": hue } as CSSProperties}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 items-start justify-between gap-3 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-medium leading-snug tracking-[-0.005em]">
            <Link
              href={`/p/${slug}`}
              className="outline-none after:absolute after:inset-0 after:content-['']"
            >
              {title}
            </Link>
          </h2>
          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-fg">
            {summary}
          </p>
        </div>
        <time
          dateTime={date}
          className="shrink-0 pt-0.5 font-mono text-[11px] text-muted-fg"
        >
          {dateFormatter.format(new Date(date))}
        </time>
      </div>
    </li>
  );
}
