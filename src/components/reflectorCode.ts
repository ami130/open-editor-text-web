/**
 * 25.2 site follow-up — the config reflector's per-framework code generator.
 * Emits the exact copy-paste integration for the current playground toggles
 * in Vanilla JS, React, Vue, or Angular. Kept in lockstep with the wrapper
 * contracts: theme/direction are reactive wrapper PROPS; minHeight/locale/
 * mentions live in construct-time `config`; plugins are factory instances.
 */

export type Framework = "js" | "react" | "vue" | "angular";

export const FRAMEWORK_TABS: Array<[Framework, string]> = [
  ["js", "JavaScript"],
  ["react", "React"],
  ["vue", "Vue"],
  ["angular", "Angular"],
];

export interface ReflectorOpts {
  factories: string[];
  localeImport: string | null;
  theme: string;
  direction: "ltr" | "rtl";
  minHeight: number;
  mentions: boolean;
}

const MENTIONS_LINE = "mentions: { source: async (query) => fetchUsers(query) }";

/** Names imported from the engine package (locale pack + plugin factories). */
function engineImports(o: ReflectorOpts, withOpenEditor: boolean): string[] {
  return [
    ...(withOpenEditor ? ["OpenEditor"] : []),
    ...(o.localeImport ? [o.localeImport] : []),
    ...o.factories,
  ];
}

function engineImportBlock(o: ReflectorOpts, withOpenEditor: boolean): string[] {
  const names = engineImports(o, withOpenEditor);
  if (names.length === 0) return [];
  return ["import {", `  ${names.join(",\n  ")},`, "} from 'openeditor-text';"];
}

/** Construct-time config entries shared by every wrapper (indent-prefixed). */
function wrapperConfigEntries(o: ReflectorOpts, indent: string): string[] {
  const out: string[] = [];
  if (o.minHeight !== 200) out.push(`${indent}minHeight: ${o.minHeight},`);
  if (o.localeImport) out.push(`${indent}locale: ${o.localeImport},`);
  if (o.mentions) out.push(`${indent}${MENTIONS_LINE},`);
  return out;
}

function vanilla(o: ReflectorOpts): string {
  const cfg: string[] = [];
  if (o.theme !== "light") cfg.push(`  theme: '${o.theme}',`);
  if (o.direction !== "ltr") cfg.push(`  direction: '${o.direction}',`);
  cfg.push(...wrapperConfigEntries(o, "  "));
  return [
    "// npm i openeditor-text",
    ...engineImportBlock(o, true),
    "",
    `const editor = new OpenEditor('#editor'${cfg.length ? `, {\n${cfg.join("\n")}\n}` : ""});`,
    ...o.factories.map((f) => `editor.plugins.install(${f}());`),
  ].join("\n");
}

function react(o: ReflectorOpts): string {
  const cfg = wrapperConfigEntries(o, "        ");
  const props: string[] = [];
  if (o.theme !== "light") props.push(`      theme="${o.theme}"`);
  if (o.direction !== "ltr") props.push(`      direction="${o.direction}"`);
  if (cfg.length) props.push(`      config={{\n${cfg.join("\n")}\n      }}`);
  if (o.factories.length) props.push("      plugins={plugins}");
  props.push("      onChange={(html) => console.log(html)}");
  return [
    "// npm i openeditor-text openeditor-text-react",
    "import { OpenEditor } from 'openeditor-text-react';",
    "import 'openeditor-text/styles';",
    ...engineImportBlock(o, false),
    "",
    ...(o.factories.length
      ? ["const plugins = [", ...o.factories.map((f) => `  ${f}(),`), "];", ""]
      : []),
    "export default function MyEditor() {",
    "  return (",
    "    <OpenEditor",
    ...props,
    "    />",
    "  );",
    "}",
  ].join("\n");
}

function vue(o: ReflectorOpts): string {
  const cfg = wrapperConfigEntries(o, "  ");
  const attrs = ["v-model=\"html\""];
  if (o.theme !== "light") attrs.push(`theme="${o.theme}"`);
  if (o.direction !== "ltr") attrs.push(`direction="${o.direction}"`);
  if (cfg.length) attrs.push(":config=\"config\"");
  if (o.factories.length) attrs.push(":plugins=\"plugins\"");
  return [
    "<!-- npm i openeditor-text openeditor-text-vue -->",
    "<script setup>",
    "import { ref } from 'vue';",
    "import { OpenEditor } from 'openeditor-text-vue';",
    "import 'openeditor-text/styles';",
    ...engineImportBlock(o, false),
    "",
    "const html = ref('');",
    ...(o.factories.length
      ? ["const plugins = [", ...o.factories.map((f) => `  ${f}(),`), "];"]
      : []),
    ...(cfg.length ? ["const config = {", ...cfg, "};"] : []),
    "</script>",
    "",
    "<template>",
    `  <OpenEditor ${attrs.join(" ")} />`,
    "</template>",
  ].join("\n");
}

function angular(o: ReflectorOpts): string {
  const cfg = wrapperConfigEntries(o, "    ");
  const attrs = ["[(ngModel)]=\"html\""];
  if (o.theme !== "light") attrs.push(`theme="${o.theme}"`);
  if (o.direction !== "ltr") attrs.push(`direction="${o.direction}"`);
  if (cfg.length) attrs.push("[config]=\"config\"");
  if (o.factories.length) attrs.push("[plugins]=\"plugins\"");
  return [
    "// npm i openeditor-text openeditor-text-angular",
    "// angular.json styles: \"node_modules/openeditor-text/dist/open-editor.css\"",
    "import { Component } from '@angular/core';",
    "import { FormsModule } from '@angular/forms';",
    "import { OpenEditorComponent } from 'openeditor-text-angular';",
    ...engineImportBlock(o, false),
    "",
    "@Component({",
    "  standalone: true,",
    "  imports: [FormsModule, OpenEditorComponent],",
    "  template: `",
    `    <open-editor ${attrs.join(" ")}></open-editor>`,
    "  `,",
    "})",
    "export class MyEditorComponent {",
    "  html = '';",
    ...(cfg.length ? ["  config = {", ...cfg, "  };"] : []),
    ...(o.factories.length
      ? ["  plugins = [", ...o.factories.map((f) => `    ${f}(),`), "  ];"]
      : []),
    "}",
  ].join("\n");
}

export function buildReflectorCode(fw: Framework, o: ReflectorOpts): string {
  switch (fw) {
    case "react": return react(o);
    case "vue": return vue(o);
    case "angular": return angular(o);
    default: return vanilla(o);
  }
}
