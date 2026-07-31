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
} from "openeditor-text";
import { useSiteTheme } from "./useSiteTheme";
import { PLAYGROUND_CONTENT } from "./demoContent";
import { buildReflectorCode, FRAMEWORK_TABS, type Framework } from "./reflectorCode";

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

/* Editable-area minimum heights; the editor's own default is 200. */
const SIZES: Array<[label: string, px: number]> = [
  ["Compact", 240],
  ["Comfortable", 480],
  ["Tall", 680],
];

const SAMPLE = PLAYGROUND_CONTENT;

const selectStyle = { borderColor: "var(--edge)" } as const;
const selectClass = "rounded-md border bg-transparent px-2 py-1 transition-colors hover:border-[var(--brand)]";

export default function Playground() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(PLUGINS.map(([k]) => k)));
  // The editor always follows the site's light/dark switch in the navbar —
  // one control themes the whole website, editors included.
  const theme = useSiteTheme();
  const [locale, setLocale] = useState("en");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [minHeight, setMinHeight] = useState(480);
  const [copied, setCopied] = useState(false);
  const [codeTab, setCodeTab] = useState<Framework>("js");
  const hostRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const editor = new OpenEditor(hostRef.current, {
      theme: theme as 'light' | 'dark' | 'minimal' | 'auto',
      direction,
      minHeight,
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
  }, [enabled, theme, locale, direction, minHeight]);

  const code = useMemo(() => buildReflectorCode(codeTab, {
    factories: PLUGINS.filter(([k]) => enabled.has(k)).map(([, , , f]) => f),
    localeImport: LOCALES[locale].importName,
    theme,
    direction,
    minHeight,
    mentions: enabled.has("mentions"),
  }), [enabled, theme, locale, direction, minHeight, codeTab]);

  const toggle = (key: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-6 self-start lg:sticky lg:top-20">
        <div className="card rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Appearance</h2>
          <div className="space-y-2.5 text-sm">
            <label className="flex items-center justify-between gap-2">Language
              <select aria-label="UI language" value={locale} onChange={(e) => { setLocale(e.target.value); if (e.target.value === "ar") setDirection("rtl"); }} className={selectClass} style={selectStyle}>
                {Object.entries(LOCALES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">Direction
              <select aria-label="Text direction" value={direction} onChange={(e) => setDirection(e.target.value as "ltr" | "rtl")} className={selectClass} style={selectStyle}>
                <option value="ltr">LTR</option><option value="rtl">RTL</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-2">Height
              <select aria-label="Editor height" value={minHeight} onChange={(e) => setMinHeight(Number(e.target.value))} className={selectClass} style={selectStyle}>
                {SIZES.map(([label, px]) => <option key={px} value={px}>{label}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="card rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--ink-muted)" }}>Plugins ({enabled.size}/{PLUGINS.length})</h2>
            <span className="flex gap-1 text-xs font-medium" style={{ color: "var(--brand)" }}>
              <button onClick={() => setEnabled(new Set(PLUGINS.map(([k]) => k)))} className="rounded px-1.5 py-0.5 hover:underline">All</button>
              <button onClick={() => setEnabled(new Set())} className="rounded px-1.5 py-0.5 hover:underline">None</button>
            </span>
          </div>
          <ul className="space-y-1.5 text-sm">
            {PLUGINS.map(([key, label]) => (
              <li key={key}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-(--paper-raised)">
                  <input type="checkbox" checked={enabled.has(key)} onChange={() => toggle(key)} className="accent-(--brand)" />
                  {label}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div ref={hostRef} key={`${theme}-${locale}-${direction}-${minHeight}-${[...enabled].join()}`} data-playground-host />
        <div className="card overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between gap-4 border-b px-4 py-2.5 text-xs" style={{ background: "var(--paper-raised)", color: "var(--ink-muted)", borderColor: "var(--edge)" }}>
            <span>
              <strong className="font-semibold" style={{ color: "var(--ink)" }}>Your config</strong>
            </span>
            <div className="flex items-center gap-1" role="group" aria-label="Code framework">
              {FRAMEWORK_TABS.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setCodeTab(id)}
                  aria-pressed={codeTab === id}
                  className="rounded px-2 py-1 font-medium transition-colors hover:bg-(--paper)"
                  style={codeTab === id
                    ? { color: "var(--brand)", background: "var(--paper)" }
                    : { color: "var(--ink-muted)" }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="rounded px-2 py-1 font-medium transition-colors hover:bg-(--paper)"
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
