"use client";
/**
 * 21.3 — the playground. A real editor rebuilt live from the visitor's
 * choices, with the CONFIG REFLECTOR: the exact copy-paste code for whatever
 * is currently toggled. (No competitor demo has this.)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  OpenEditor,
  localeEs, localeFr, localeDe, localeAr,
  createImagePlugin, createLinkPlugin, createTablePlugin, createMediaPlugin,
  createFindReplacePlugin, createCodeBlockPlugin, createSourcePlugin,
  createSpecialCharsPlugin, createEmojiPlugin, createFormatPainterPlugin,
  createPreviewPlugin, createSpellcheckPlugin, createResizeEditorPlugin,
  createSlashCommandPlugin, createAutoformatPlugin, createMentionsPlugin,
  createBlockDragPlugin, createTodoListPlugin, createBookmarkPlugin,
} from "@open-editor-hq/core";

const PLUGINS: Array<[key: string, label: string, factory: () => unknown, factoryName: string]> = [
  ["image", "Images", createImagePlugin, "createImagePlugin"],
  ["link", "Links", createLinkPlugin, "createLinkPlugin"],
  ["table", "Tables", createTablePlugin, "createTablePlugin"],
  ["media", "Video embeds", createMediaPlugin, "createMediaPlugin"],
  ["findReplace", "Find & replace", createFindReplacePlugin, "createFindReplacePlugin"],
  ["codeBlock", "Code blocks", createCodeBlockPlugin, "createCodeBlockPlugin"],
  ["source", "Source view", createSourcePlugin, "createSourcePlugin"],
  ["specialChars", "Special characters", createSpecialCharsPlugin, "createSpecialCharsPlugin"],
  ["emoji", "Emoji", createEmojiPlugin, "createEmojiPlugin"],
  ["formatPainter", "Format painter", createFormatPainterPlugin, "createFormatPainterPlugin"],
  ["preview", "Preview", createPreviewPlugin, "createPreviewPlugin"],
  ["spellcheck", "Spellcheck toggle", createSpellcheckPlugin, "createSpellcheckPlugin"],
  ["resizeEditor", "Resizable editor", createResizeEditorPlugin, "createResizeEditorPlugin"],
  ["slashCommand", "Slash commands", createSlashCommandPlugin, "createSlashCommandPlugin"],
  ["autoformat", "Markdown autoformat", createAutoformatPlugin, "createAutoformatPlugin"],
  ["mentions", "@Mentions", createMentionsPlugin, "createMentionsPlugin"],
  ["blockDrag", "Block drag-reorder", createBlockDragPlugin, "createBlockDragPlugin"],
  ["todoList", "To-do lists", createTodoListPlugin, "createTodoListPlugin"],
  ["bookmark", "Bookmarks", createBookmarkPlugin, "createBookmarkPlugin"],
];

const LOCALES: Record<string, { pack: Record<string, string> | null; label: string; importName: string | null }> = {
  en: { pack: null, label: "English", importName: null },
  es: { pack: localeEs, label: "Español", importName: "localeEs" },
  fr: { pack: localeFr, label: "Français", importName: "localeFr" },
  de: { pack: localeDe, label: "Deutsch", importName: "localeDe" },
  ar: { pack: localeAr, label: "العربية", importName: "localeAr" },
};

const SAMPLE = "<h2>Playground</h2><p>Everything you toggle on the left is live here — and the code below the editor is exactly what you'd write.</p><ul data-todo-list><li data-todo data-checked=\"false\">Try / for slash commands</li></ul>";

export default function Playground() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(PLUGINS.map(([k]) => k)));
  const [theme, setTheme] = useState("light");
  const [locale, setLocale] = useState("en");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [copied, setCopied] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const editor = new OpenEditor(hostRef.current, {
      theme: theme as 'light' | 'dark' | 'minimal' | 'auto',
      direction,
      defaultContent: SAMPLE,
      ...(LOCALES[locale].pack ? { locale: LOCALES[locale].pack } : {}),
      ...(enabled.has("mentions")
        ? { mentions: { source: async (q: string) => ["Ada", "Grace", "Linus"].filter((n) => n.toLowerCase().includes(q.toLowerCase())).map((n, i) => ({ id: i, label: n })) } }
        : {}),
    });
    for (const [key, , factory] of PLUGINS) {
      if (enabled.has(key)) editor.plugins.install(factory() as never);
    }
    editorRef.current = editor;
    return () => { if (!editor.isDestroyed()) editor.destroy(); };
  }, [enabled, theme, locale, direction]);

  const code = useMemo(() => {
    const active = PLUGINS.filter(([k]) => enabled.has(k));
    const imports = ["OpenEditor", ...(LOCALES[locale].importName ? [LOCALES[locale].importName] : []), ...active.map(([, , , f]) => f)];
    const cfg: string[] = [];
    if (theme !== "light") cfg.push(`  theme: '${theme}',`);
    if (direction !== "ltr") cfg.push(`  direction: '${direction}',`);
    if (LOCALES[locale].importName) cfg.push(`  locale: ${LOCALES[locale].importName},`);
    if (enabled.has("mentions")) cfg.push("  mentions: { source: async (query) => fetchUsers(query) },");
    return [
      `import {`,
      `  ${imports.join(",\n  ")},`,
      `} from '@open-editor-hq/core';`,
      ``,
      `const editor = new OpenEditor('#editor'${cfg.length ? `, {\n${cfg.join("\n")}\n}` : ""});`,
      ...active.map(([, , , f]) => `editor.plugins.install(${f}());`),
    ].join("\n");
  }, [enabled, theme, locale, direction]);

  const toggle = (key: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Appearance</h2>
          <div className="space-y-2 text-sm">
            <label className="flex items-center justify-between gap-2">Theme
              <select aria-label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} className="rounded border bg-transparent px-2 py-1" style={{ borderColor: "var(--edge)" }}>
                {["light", "dark", "minimal", "auto"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">Language
              <select aria-label="UI language" value={locale} onChange={(e) => { setLocale(e.target.value); if (e.target.value === "ar") setDirection("rtl"); }} className="rounded border bg-transparent px-2 py-1" style={{ borderColor: "var(--edge)" }}>
                {Object.entries(LOCALES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">Direction
              <select aria-label="Text direction" value={direction} onChange={(e) => setDirection(e.target.value as "ltr" | "rtl")} className="rounded border bg-transparent px-2 py-1" style={{ borderColor: "var(--edge)" }}>
                <option value="ltr">LTR</option><option value="rtl">RTL</option>
              </select>
            </label>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Plugins ({enabled.size}/{PLUGINS.length})</h2>
          <ul className="space-y-1.5 text-sm">
            {PLUGINS.map(([key, label]) => (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={enabled.has(key)} onChange={() => toggle(key)} className="accent-[var(--brand)]" />
                  {label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div ref={hostRef} key={`${theme}-${locale}-${direction}-${[...enabled].join()}`} data-playground-host />
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--edge)" }}>
          <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ background: "var(--paper-raised)", color: "var(--ink-muted)" }}>
            <span>Your configuration — copy-paste ready</span>
            <button
              onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="rounded px-2 py-1 font-medium"
              style={{ color: "var(--brand)" }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-relaxed" data-config-reflector><code>{code}</code></pre>
        </div>
      </div>
    </div>
  );
}
