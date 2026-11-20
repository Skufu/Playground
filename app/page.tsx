import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { listPrototypes } from "@/lib/prototypes";
import { PrototypeCard } from "@/components/prototype-card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const prototypes = listPrototypes();

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
      <header className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] font-medium leading-none tracking-[-0.02em]">
            Playground
          </h1>
          <p className="max-w-[54ch] text-sm leading-relaxed text-muted-fg">
            Small, self-contained prototypes. One folder each, nothing shared
            but the tokens, nothing to maintain.
          </p>
        </div>
        <ThemeToggle />
      </header>

      {prototypes.length === 0 ? <EmptyState /> : (
        <ul className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prototypes.map((prototype) => (
            <PrototypeCard key={prototype.slug} prototype={prototype} />
          ))}
        </ul>
      )}

      <footer className="mt-12 flex flex-wrap items-center gap-2 border-t border-border pt-5 text-xs text-muted-fg">
        <span>Add one:</span>
        <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
          prototypes/&lt;slug&gt;/meta.json
        </code>
        <span aria-hidden>·</span>
        <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
          pnpm sync
        </code>
      </footer>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mt-9 flex flex-col items-start gap-3 rounded-xl border border-dashed border-border-strong px-6 py-12">
      <p className="text-sm font-medium">No prototypes yet.</p>
      <p className="max-w-[46ch] text-sm leading-relaxed text-muted-fg">
        Create <code className="font-mono text-[13px] text-fg">prototypes/hello/meta.json</code>{" "}
        and a page next to it, then run{" "}
        <code className="font-mono text-[13px] text-fg">pnpm sync</code>.
      </p>
      <Link
        href="https://nextjs.org/docs/app"
        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        Next.js App Router
        <ArrowUpRight className="size-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}
