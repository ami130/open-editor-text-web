"use client";
/**
 * The landing hero: a REAL editor, dogfooding @open-editor-hq/react.
 */
import { useState } from "react";
import { OpenEditor } from "@open-editor-hq/react";

const INITIAL = [
  "<h2>This editor is real — try it</h2>",
  "<p>Type, select text for <strong>formatting</strong>, press <code>/</code> for the command palette, or paste anything. ",
  "Every feature you can toggle in the <a href=\"/playground\">playground</a> ships free.</p>",
  "<ul data-todo-list><li data-todo data-checked=\"true\">Zero dependencies</li>",
  "<li data-todo data-checked=\"true\">No license key</li>",
  "<li data-todo data-checked=\"false\">Your next editor?</li></ul>",
].join("");

export default function HeroEditor() {
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");
  return (
    <div className="rounded-2xl border p-1 shadow-sm" style={{ borderColor: "var(--edge)", background: "var(--paper-raised)" }}>
      <div className="flex items-center justify-between px-3 py-2 text-xs" style={{ color: "var(--ink-muted)" }}>
        <span>live — this is the actual npm package, not a video</span>
        <label className="flex items-center gap-2">
          theme
          <select
            aria-label="Editor theme"
            className="rounded border bg-transparent px-1 py-0.5"
            style={{ borderColor: "var(--edge)" }}
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark" | "auto")}
          >
            <option value="auto">auto</option>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
      </div>
      <OpenEditor value={INITIAL} theme={theme} />
    </div>
  );
}
