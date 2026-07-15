import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const DOCS_DIR = join(process.cwd(), "content", "docs");

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
        <Markdown remarkPlugins={[remarkGfm]}>{md}</Markdown>
      </article>
    </div>
  );
}
