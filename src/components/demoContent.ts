/**
 * Rich default content for the homepage hero editor:
 * one glance shows headings, formatting, an image, a table, a sandboxed video
 * embed, quotes, and to-do lists — so visitors immediately see the advanced
 * features, not an empty box. Everything here survives the editor's sanitizer
 * (the iframe is a youtube-nocookie embed, the image a local file).
 */

const SHOWCASE = [
  '<img src="/demo/aurora.svg" alt="A gradient banner inserted with the image plugin — click it to resize or align" />',
  "<h2>Tables — free, not a paid unlock</h2>",
  // class="oe-table" is what the table plugin puts on inserted tables — it
  // carries the editor's bordered, fixed-layout table styling.
  '<table class="oe-table"><thead><tr><th>Feature</th><th>Open Editor</th><th>Elsewhere</th></tr></thead><tbody>',
  "<tr><td>Tables</td><td>✓ Free</td><td>Paid in CKEditor tiers</td></tr>",
  "<tr><td>Slash commands</td><td>✓ Free</td><td>Jodit PRO</td></tr>",
  "<tr><td>To-do lists</td><td>✓ Free</td><td>Jodit PRO</td></tr>",
  "</tbody></table>",
  "<h2>Video embeds</h2>",
  "<p>Paste a YouTube or Vimeo URL and it becomes a privacy-friendly, sandboxed embed:</p>",
  // Exactly the markup the media plugin produces: the sanitizer only keeps
  // iframes with an allowlisted https host AND a sandbox attribute limited to
  // approved tokens; the figure wrapper gives it the plugin's styling/UX.
  '<figure class="oe-embed" contenteditable="false" data-oe-island="video" data-provider="youtube">',
  '<iframe src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" sandbox="allow-scripts allow-same-origin allow-presentation" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="Big Buck Bunny — an open-licensed short film" class="oe-embed__frame"></iframe>',
  '<div class="oe-embed__shield"></div>',
  "</figure>",
  "<h2>And the little things</h2>",
  "<blockquote>Blockquotes, code blocks, emoji 🎉, @mentions, find &amp; replace, full RTL, five languages — every feature in this document ships in the free core.</blockquote>",
  '<ul data-todo-list>',
  '<li data-todo data-checked="true">Zero dependencies</li>',
  '<li data-todo data-checked="true">No license key</li>',
  '<li data-todo data-checked="false">Your next editor?</li>',
  "</ul>",
].join("");

export const HERO_CONTENT = [
  "<h1>This editor is real — try it ✨</h1>",
  '<p>Click anywhere and type. Select text for <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <a href="/docs">links</a> and <code>inline code</code> — or press <code>/</code> for the command palette.</p>',
  SHOWCASE,
].join("");
