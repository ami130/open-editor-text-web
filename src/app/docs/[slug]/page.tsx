import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode, ReactElement } from "react";

const DOCS_DIR = join(process.cwd(), "content", "docs");

// GitHub-style heading anchors + keyboard-focusable code blocks (axe:
// scrollable-region-focusable). No extra deps — a tiny slugger is enough.
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s/g, "-");

const mdComponents: Components = {
  h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(textOf(children))}>{children}</h3>,
  pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
};

export function generateStaticParams() {
  return readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ slug: f.replace(/\.md$/, "") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${slug} — Open Editor docs` };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[A-Z-]+$/.test(slug)) notFound();
  let md: string;
  try {
    md = readFileSync(join(DOCS_DIR, `${slug}.md`), "utf-8");
  } catch {
    notFound();
  }
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/docs" className="text-sm underline underline-offset-4" style={{ color: "var(--brand)" }}>← All docs</Link>
      <article className="prose-docs mt-4">
        <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{md}</Markdown>
      </article>
    </div>
  );
}
