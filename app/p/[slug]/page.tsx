import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLoader, getPrototype, listPrototypes } from "@/lib/prototypes";

export function generateStaticParams() {
  return listPrototypes().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const prototype = getPrototype(slug);
  if (!prototype) return {};
  return { title: prototype.title, description: prototype.summary };
}

export default async function PrototypePage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const prototype = getPrototype(slug);
  const load = getLoader(slug);

  if (!prototype || !load) notFound();

  const { default: Prototype } = await load();

  return (
    <>
      <Link
        href="/"
        aria-label="Back to playground"
        className="fixed left-3 top-3 z-50 flex h-11 items-center gap-1.5 rounded-full border border-border bg-surface/85 pl-2.5 pr-3.5 text-[13px] font-medium text-muted-fg backdrop-blur-md transition-colors duration-150 hover:border-border-strong hover:text-fg active:scale-[0.98]"
      >
        <ArrowLeft className="size-4" strokeWidth={2} />
        Index
      </Link>
      <Prototype />
    </>
  );
}
