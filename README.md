# ቡቡዳጢ

A question-bank website. Every multiple-choice question gets its own page and ID
(`ቡቡዳጢ001`, `ቡቡዳጢ002`, …) so it can be found in search engines.

- Page for each question: `https://<your-project>.vercel.app/q/001`
- Home page with a search box: `https://<your-project>.vercel.app/`
- Sitemap: `/sitemap.xml` · robots: `/robots.txt`

No dependencies — just Node.js (Vercel has it).

## Deploy on Vercel (one time)

1. Go to https://vercel.com/new and import this GitHub repository.
2. Leave all settings as they are (they come from `vercel.json`) and click **Deploy**.
3. The site address is set in `site.config.json` (`siteUrl`); change it there if the domain changes.
   If you ever change the domain, you can force it with an environment variable
   `SITE_URL` (e.g. `https://bubudati.vercel.app`).

## Adding more questions

1. Put the new Word file in the `questions/` folder, with a name that sorts **after**
   the existing ones, e.g. `002-new-batch.docx`, `003-...docx`.
2. Commit / upload it to GitHub (you can do this from github.com with "Add file → Upload files").
3. Vercel rebuilds automatically. New questions continue the numbering.

Word file format: question paragraph, then options `A.`, `B.`, `C.`, `D.`;
**make the text of the correct option bold**.

To keep old IDs from changing: don't delete or reorder questions in files already
published, and don't rename old files. (Fixing typos is fine.)
The Vercel build log prints a WARNING for any question without exactly one bold answer.

## Getting indexed fast

**Bing (also used by Windows Start search, DuckDuckGo, Yahoo, Ecosia, Copilot):**
the site sends every URL to Bing through **IndexNow** automatically on each production
deploy. For even better results:
1. Open https://www.bing.com/webmasters, sign in, add the site
   (easiest: "Import from Google Search Console" after the Google steps below).
2. Submit `https://<your-project>.vercel.app/sitemap.xml`.

**Google:**
1. Open https://search.google.com/search-console, add a **URL prefix** property with your
   vercel.app address.
2. Choose the **HTML tag** verification method, copy only the `content="..."` value,
   add it in Vercel → Project → Settings → Environment Variables as
   `GOOGLE_SITE_VERIFICATION`, then redeploy and click Verify.
   (For Bing's tag method, use `BING_SITE_VERIFICATION`.)
3. In Search Console → **Sitemaps**, submit `sitemap.xml`.
4. For the most important pages, paste the URL in the top search bar (**URL inspection**)
   and click **Request indexing** (Google limits this to a handful per day).

## Local preview

```
npm run build        # builds into public/
npm run dev          # builds and serves on http://localhost:3000
```

## Settings

`site.config.json` holds the public site address (`siteUrl`), the site name, home page title and description, ID prefix, number of digits in IDs, and
the IndexNow key (the same key must stay in place once in use).
