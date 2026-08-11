# Image uploads — connect to your API & database

This guide shows how to wire the editor's image upload to **your own backend**,
so a user's dropped, pasted, or picked image is sent to **your API**, stored in
**your storage/database**, and inserted into the document as a URL you control.

It's the same model as Jodit's uploader — you point the editor at an endpoint,
your server saves the file and returns a URL, the editor inserts it.

## Contents

- [How the flow works](#how-the-flow-works)
- [Step 1 — point the editor at your endpoint](#step-1--point-the-editor-at-your-endpoint)
- [Step 2 — the request the editor sends](#step-2--the-request-the-editor-sends)
- [Step 3 — the response your server must return](#step-3--the-response-your-server-must-return)
- [Step 4 — authentication (headers, cookies)](#step-4--authentication-headers-cookies)
- [Step 5 — extra fields & custom field name](#step-5--extra-fields--custom-field-name)
- [Step 6 — mapping a custom response shape](#step-6--mapping-a-custom-response-shape)
- [Step 7 — take over the upload entirely (S3, Cloudinary, pre-signed)](#step-7--take-over-the-upload-entirely-s3-cloudinary-pre-signed-urls)
- [Full server examples](#full-server-examples)
  - [Node / Express + Multer](#node--express--multer)
  - [Next.js Route Handler](#nextjs-route-handler)
  - [NestJS](#nestjs)
- [Framework wiring (React / Vue / Angular)](#framework-wiring)
- [Errors, limits & feedback](#errors-limits--feedback)
- [Without an upload server (data URIs)](#without-an-upload-server-data-uris)
- [Security checklist](#security-checklist)
- [Option reference](#option-reference)

## How the flow works

```
User inserts an image (pick / drag-drop / paste)
        │
        ▼
Editor POSTs the file  ──►  YOUR API (imageUploadUrl)
                                 │  save to S3 / disk / DB
                                 ▼
Editor inserts <img src>  ◄──  { "url": "https://cdn.you/…​.webp" }
```

Or, with [`imageUploadHandler`](#step-7--take-over-the-upload-entirely-s3-cloudinary-pre-signed-urls),
you make the requests yourself and the file can go **straight to storage**,
never passing through your server at all.

The editor never stores the image itself — your server does. The editor only
needs a **URL** back, which it puts into the document. That URL is what ends up
in `getHTML()` and, therefore, in whatever you persist.

## Step 1 — point the editor at your endpoint

Set one option, `imageUploadUrl`:

```js
import { OpenEditor } from 'openeditor-text';

const editor = new OpenEditor('#app', {
  imageUploadUrl: 'https://api.yoursite.com/uploads/editor-image',
});
```

That's the minimum. With it set, the file picker, drag-and-drop, and clipboard
paste all route through your endpoint, showing a **progress bar with a Cancel
button** while it uploads.

## Step 2 — the request the editor sends

The editor sends a standard browser file upload:

- **Method:** `POST` to your `imageUploadUrl`
- **Content type:** `multipart/form-data` (the browser sets the boundary — do
  not override it)
- **Body:** the file under the field named **`file`** (rename it with
  [`imageUploadFieldName`](#step-5--extra-fields--custom-field-name))

Your server reads it exactly like any HTML `<form enctype="multipart/form-data">`
file field.

## Step 3 — the response your server must return

Your endpoint must return **JSON** with the hosted URL at the top level:

```json
{ "url": "https://cdn.yoursite.com/uploads/photo.webp" }
```

- `{ "src": "…" }` is accepted as an alias for `url`.
- The nested shape `{ "data": { "url": "…" } }` (NestJS/Laravel-style) is
  understood out of the box.
- Any other shape → map it with
  [`imageUploadResponse`](#step-6--mapping-a-custom-response-shape).

Optionally return `sources` to emit a responsive `<picture>` (the `<img>` stays
as the fallback):

```json
{
  "url": "https://cdn.yoursite.com/photo.jpg",
  "sources": [
    { "srcset": "https://cdn.yoursite.com/photo.avif", "type": "image/avif" },
    { "srcset": "https://cdn.yoursite.com/photo-800.jpg 800w", "sizes": "100vw" }
  ]
}
```

Every returned URL (including each `srcset`) is scheme-checked against the same
URL policy as any other `src` — an unsafe URL rejects the whole upload.

## Step 4 — authentication (headers, cookies)

Most real endpoints require auth. There are two ways, use whichever your API
uses.

**Bearer token / API key — `imageUploadHeaders`:**

```js
new OpenEditor('#app', {
  imageUploadUrl: 'https://api.yoursite.com/uploads/editor-image',
  imageUploadHeaders: {
    Authorization: `Bearer ${myAccessToken}`,
    'X-CSRF-Token': csrfToken,
  },
});
```

Because the token often changes (refresh, per-session), you can pass a
**function** — it's called for each upload, so it always reads the current
token:

```js
new OpenEditor('#app', {
  imageUploadUrl: '/api/uploads',
  imageUploadHeaders: () => ({ Authorization: `Bearer ${getToken()}` }),
});
```

> **Never set `Content-Type` in `imageUploadHeaders`.** The browser must set the
> `multipart/form-data` boundary itself; a `Content-Type` you provide is ignored
> to avoid breaking the upload.

**Cookie / session auth — `imageUploadWithCredentials`:**

If your API authenticates with a session cookie and the upload is cross-origin,
send credentials:

```js
new OpenEditor('#app', {
  imageUploadUrl: 'https://api.yoursite.com/uploads',
  imageUploadWithCredentials: true, // sends cookies cross-origin
});
```

(Your server must also send `Access-Control-Allow-Credentials: true` and a
specific `Access-Control-Allow-Origin` — not `*`.)

## Step 5 — extra fields & custom field name

**Associate the upload with a record in your DB** — send extra form fields with
`imageUploadData` (object, or a function of the file):

```js
new OpenEditor('#app', {
  imageUploadUrl: '/api/uploads',
  imageUploadData: { postId: '123', folder: 'articles' },
  // or dynamic:
  // imageUploadData: (file) => ({ postId: currentPostId(), originalName: file.name }),
});
```

Your server receives `postId` / `folder` as normal form fields alongside the
file, so you can store the row against the right post/user/folder.

**Rename the file field** if your backend doesn't expect `file`:

```js
new OpenEditor('#app', {
  imageUploadUrl: '/api/uploads',
  imageUploadFieldName: 'image', // now sent as the `image` field, not `file`
});
```

## Step 6 — mapping a custom response shape

If your API can't return `{ url }` or `{ data: { url } }`, transform its
response client-side with `imageUploadResponse` (Jodit's `process()` equivalent):

```js
new OpenEditor('#app', {
  imageUploadUrl: '/api/uploads',
  // Server returns e.g. { result: { fileUrl: "https://cdn/x.webp" } }
  imageUploadResponse: (json) => json.result.fileUrl,
});
```

Return a URL **string**, or an object `{ url, sources }` for a responsive
`<picture>`. Return `null`/throw to reject the upload.

## Step 7 — take over the upload entirely (S3, Cloudinary, pre-signed URLs)

Everything above assumes one shape: the editor POSTs multipart to **one URL**
and your server stores the file. That covers most backends — but not all.

It cannot express:

- **S3 / R2 pre-signed uploads** — ask your API for a URL, then `PUT` the raw
  bytes straight to storage (the file never touches your server)
- **Cloudinary / Uploadcare signed flows** — fetch a signature, then upload
- anything needing **two round-trips**, a different verb, or a non-multipart body

For those, `imageUploadHandler` hands the whole upload to you:

```js
new OpenEditor('#app', {
  imageUploadHandler: async (file, { signal, onProgress }) => {
    // 1. Ask your API where to put it.
    const { uploadUrl, publicUrl } = await fetch('/api/sign-upload', {
      method: 'POST',
      body: JSON.stringify({ name: file.name, type: file.type }),
      signal,
    }).then((r) => r.json());

    // 2. Upload straight to storage — your server never sees the bytes.
    await fetch(uploadUrl, { method: 'PUT', body: file, signal });
    onProgress(100);

    // 3. Return the public URL the editor should insert.
    return publicUrl;
  },
});
```

**Return** a URL string, or `{ url, width?, height?, sources? }`. Supplying
`width`/`height` skips the editor's own measuring round-trip — useful when your
CDN already reports them. Return `null` to signal a cancelled upload.

**`signal`** is an `AbortSignal` — pass it to your `fetch` calls so the editor's
cancel button actually cancels. **`onProgress(percent)`** drives the progress
bar. Both are easy to ignore and both are noticeable when missing.

> `imageUploadHandler` **takes precedence over `imageUploadUrl`** when both are
> set. The other `imageUpload*` options (headers, field name, extra data,
> response mapping) apply to the built-in uploader only — inside a handler,
> you are making the requests, so you control all of that directly.

Errors thrown inside the handler are surfaced to the user, so a rejected upload
reads as a real message rather than a silent no-op:

```js
imageUploadHandler: async (file) => {
  if (file.size > 5_000_000) throw new Error('Images must be under 5 MB.');
  // …
},
```

Security note: the URL you return is still scheme-checked by the editor.
`javascript:` and other unsafe schemes are rejected, so a bug in a handler
cannot become an XSS in the document.

## Full server examples

Each example: accepts the `file` field, stores it, and returns `{ url }`.
Storage is shown as local disk for brevity — swap in S3/GCS/DB as needed.

### Node / Express + Multer

```js
import express from 'express';
import multer from 'multer';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
const app = express();

app.post('/uploads/editor-image', requireAuth, upload.single('file'), async (req, res) => {
  // req.file → the uploaded image; req.body.postId → your imageUploadData field
  const stored = await saveToStorage(req.file);          // S3 / disk / DB — your call
  await db.images.insert({ url: stored.url, postId: req.body.postId, userId: req.user.id });
  res.json({ url: stored.url });                          // ← the contract
});
```

> If you renamed the field with `imageUploadFieldName: 'image'`, use
> `upload.single('image')` here to match.

### Next.js Route Handler

```ts
// app/api/uploads/route.ts   (this project's modified Next.js)
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');         // ← imageUploadHeaders
  if (!isValid(auth)) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file') as File;                 // or your imageUploadFieldName
  const postId = form.get('postId');                     // ← imageUploadData

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await saveToStorage(bytes, file.name, file.type);
  await db.images.create({ data: { url: stored.url, postId } });

  return Response.json({ url: stored.url });
}
```

### NestJS

```ts
@Post('uploads/editor-image')
@UseGuards(AuthGuard)                                     // reads imageUploadHeaders' Bearer token
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File, @Body('postId') postId: string) {
  const stored = await this.storage.save(file);
  await this.images.create({ url: stored.url, postId });
  // NestJS-style nested response is understood by the editor out of the box:
  return { data: { url: stored.url } };
}
```

## Framework wiring

Same options, passed through each wrapper's `config`.

**React**

```jsx
<OpenEditor config={{
  imageUploadUrl: '/api/uploads',
  imageUploadHeaders: () => ({ Authorization: `Bearer ${useToken()}` }),
  imageUploadData: { postId },
}} />
```

**Vue 3**

```vue
<OpenEditor :config="{
  imageUploadUrl: '/api/uploads',
  imageUploadHeaders: { Authorization: `Bearer ${token}` },
}" />
```

**Angular**

```html
<open-editor [config]="{
  imageUploadUrl: '/api/uploads',
  imageUploadWithCredentials: true
}"></open-editor>
```

## Errors, limits & feedback

- **Progress + cancel:** the upload shows a live progress bar with a Cancel
  button; cancelling aborts the request cleanly.
- **Size limit:** files over `imageMaxFileSize` (default 10 MB) are rejected
  before upload, on all three insert paths (picker, drop, paste).
- **Server errors:** a non-2xx response or non-JSON body rejects the upload and
  fires the editor's `error` event — listen for it to show your own message:

  ```js
  editor.on('error', ({ error, context }) => {
    if (context && context.startsWith('plugin:image')) showToast(error.message);
  });
  ```

- **Required alt text:** set `imageRequireAlt: true` to force a description
  before any image (dialog, drop, or paste) is inserted — good for accessibility.

## Without an upload server (data URIs)

If you don't set `imageUploadUrl`, a picked/dropped/pasted local file would
become a base64 **`data:` URI** embedded directly in the HTML. That is **blocked
by default** (it bloats saved content and isn't stored anywhere you control). To
allow it anyway — e.g. a quick demo with no backend — opt in:

```js
new OpenEditor('#app', { imageAllowDataUri: true });
```

For anything production, prefer `imageUploadUrl` so images live in your storage,
not inside the document. Inserting an image **by URL** always works regardless.

## Security checklist

- **Validate on the server**, never trust the client: re-check the MIME type and
  size, cap dimensions, and consider re-encoding (e.g. to WebP) to strip
  metadata and defang malicious payloads.
- **Authenticate the endpoint** — use `imageUploadHeaders` or
  `imageUploadWithCredentials`; don't leave an open upload route.
- **Scope storage** to the authenticated user (use `imageUploadData` to pass the
  owning record id, then enforce ownership server-side).
- **Return only URLs you host** on trusted origins — the editor scheme-checks
  them, but you control what you emit.
- **CORS:** for cross-origin uploads with cookies, set a specific
  `Access-Control-Allow-Origin` (not `*`) plus
  `Access-Control-Allow-Credentials: true`.

## Option reference

| Option | Type | Default | Purpose |
|---|---|---|---|
| `imageUploadUrl` | string \| null | `null` | POST endpoint; enables server upload. |
| `imageUploadHandler` | `(file,{signal,onProgress})=>url \| {url,…}` \| null | `null` | Take over the upload entirely (S3/Cloudinary/pre-signed). Wins over `imageUploadUrl`. |
| `imageUploadHeaders` | object \| `(file)=>object` \| null | `null` | Auth/other request headers (never `Content-Type`). |
| `imageUploadWithCredentials` | boolean | `false` | Send cookies cross-origin. |
| `imageUploadFieldName` | string \| null | `null` | Multipart field name (default `file`). |
| `imageUploadData` | object \| `(file)=>object` \| null | `null` | Extra form fields sent with the file. |
| `imageUploadResponse` | `(json)=>url \| {url,sources?}` \| null | `null` | Map a custom response shape to a URL. |
| `imageMaxFileSize` | number | `10485760` | Max bytes (10 MB) before rejection. |
| `imageRequireAlt` | boolean | `false` | Require alt text before insert. |
| `imageAllowDataUri` | boolean | `false` | Allow base64 `data:` images (no server). |

See the full [Configuration reference](/docs/CONFIG) for every editor option.
