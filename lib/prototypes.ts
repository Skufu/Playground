import type { ComponentType } from "react";
import { LOADERS, PROTOTYPES } from "./prototypes.generated";

export type PrototypeMeta = {
  /** Folder name under `prototypes/`. Doubles as the URL: `/p/<slug>`. */
  slug: string;
  title: string;
  /** One sentence. Shown on the index card, so keep it under ~140 characters. */
  summary: string;
  tags: string[];
  /** 0–360. Drives the generated thumbnail tint. */
  hue: number;
  /** ISO date. Newest first on the index. */
  date: string;
  /** Optional path under `public/`. Omit to use the generated tint. */
  thumbnail?: string;
};

export type PrototypeLoader = () => Promise<{ default: ComponentType }>;

export function listPrototypes(): PrototypeMeta[] {
  return [...PROTOTYPES].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPrototype(slug: string): PrototypeMeta | undefined {
  return PROTOTYPES.find((prototype) => prototype.slug === slug);
}

export function getLoader(slug: string): PrototypeLoader | undefined {
  return LOADERS[slug];
}
