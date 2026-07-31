"use client";
/**
 * The landing hero: a REAL editor, dogfooding openeditor-text-react.
 */
import { useState } from "react";
import { OpenEditor } from "openeditor-text-react";
import {
  createImagePlugin, createLinkPlugin, createTablePlugin, createMediaPlugin,
  createTodoListPlugin, createSlashCommandPlugin, createAutoformatPlugin,
  createEmojiPlugin, createCodeBlockPlugin,
} from "openeditor-text";
import { useSiteTheme } from "./useSiteTheme";
import { HERO_CONTENT } from "./demoContent";

export default function HeroEditor() {
  // The editor always follows the site's light/dark switch — one control
  // themes the whole website, editors included. (The editor's own 'auto'
  // theme only sees the OS preference, not our toggle, hence the hook.)
  const theme = useSiteTheme();
  // Plugins are construct-time: create one set per mounted editor so the
  // image, table, embed, and to-do content in HERO_CONTENT is fully editable.
  const [plugins] = useState(() => [
    createImagePlugin(), createLinkPlugin(), createTablePlugin(), createMediaPlugin(),
    createTodoListPlugin(), createSlashCommandPlugin(), createAutoformatPlugin(),
    createEmojiPlugin(), createCodeBlockPlugin(),
  ]);
  return (
    // .hero-editor caps ONLY the editable area (globals.css) so the toolbar
    // and status bar stay visible while the document scrolls inside the card.
    <div className="hero-editor card rounded-2xl border p-1 shadow-sm" style={{ background: "var(--paper-raised)" }}>
      <div className="px-3 py-2 text-xs" style={{ color: "var(--ink-muted)" }}>
        live — this is the actual npm package, not a video. Scroll it: images, tables, embeds…
      </div>
      <OpenEditor value={HERO_CONTENT} theme={theme} plugins={plugins} />
    </div>
  );
}
