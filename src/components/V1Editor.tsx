"use client";

/**
 * V1Editor — a minimal React binding for the v1 engine class.
 *
 * ─── WHY NOT `openeditor-text-react` ────────────────────────────────────────
 * That wrapper is v1-era: it does `import { OpenEditor } from 'openeditor-text'`,
 * expecting the ENGINE CLASS at that specifier. Since this app moved
 * `openeditor-text` to v2 (the runtime loader, which exports `createEditor` and
 * has no class to import), the wrapper resolves to v2 and the build fails with
 * "Export OpenEditor doesn't exist in target module".
 *
 * A pnpm override pinning the wrapper's peer to the v1 alias does not work:
 * pnpm will not resolve a `parent>child` override to an aliased `npm:` target,
 * so it kept installing 2.0.0. Rather than keep fighting resolution, this file
 * binds the v1 class directly — it is ~40 lines against the wrapper's 1.9 KB,
 * and it removes a dependency whose peer range (`>=1.1.0`) will keep matching
 * v2 and re-breaking the build.
 *
 * Deliberately implements ONLY the props this site actually uses (value, theme,
 * plugins, className, style). It is not a general-purpose wrapper and should
 * not grow into one — new v1 surface belongs in the published wrapper, and
 * anything new on this site should target v2 via the loader instead.
 */
import { useEffect, useRef } from "react";
import { OpenEditor as OpenEditorClass } from "openeditor-text-v1";
import type { CSSProperties } from "react";

interface V1EditorProps {
  value?: string;
  /** Reactive: applied to the live instance rather than remounting. */
  theme?: string;
  /** Construct-time, matching the published wrapper — remount via `key`. */
  plugins?: unknown[];
  className?: string;
  style?: CSSProperties;
}

export default function V1Editor({ value, theme, plugins, className, style }: V1EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<InstanceType<typeof OpenEditorClass> | null>(null);

  // Mount once. `value` and `plugins` are construct-time here, exactly as in
  // the published wrapper: re-running this on every value change would destroy
  // the caret on each keystroke.
  useEffect(() => {
    if (!hostRef.current) return undefined;
    const editor = new OpenEditorClass(hostRef.current, {
      ...(value !== undefined ? { defaultContent: value } : {}),
      ...(theme ? { theme } : {}),
      ...(plugins ? { plugins } : {}),
    } as ConstructorParameters<typeof OpenEditorClass>[1]);
    editorRef.current = editor;
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme IS reactive — the site's light/dark toggle must reach a live editor
  // without remounting it and discarding the visitor's edits.
  useEffect(() => {
    if (theme) editorRef.current?.setTheme(theme);
  }, [theme]);

  return <div ref={hostRef} className={className} style={style} />;
}
