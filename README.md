# ቡቡዳጢ

A question-bank website. Every multiple-choice question gets its own page and ID
(`ቡቡዳጢ001`, `ቡቡዳጢ002`, …) so it can be found in search engines.

- Page for each question: `https://<your-project>.vercel.app/q/001`
- Home page with a search box: `https://<your-project>.vercel.app/`
- Sitemap: `/sitemap.xml` · robots: `/robots.txt`

No dependencies — just Node.js (Vercel has it). Works offline on a local network too.

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

## Download links (Word files, PDFs, …)

Put any file in the `downloads/` folder and it gets a download button on the
**Downloads** page (`/downloads`, linked at the top of every page). The page
and the menu link only appear when the folder has at least one file.

- Online: on github.com open the `downloads` folder → **Add file → Upload files** →
  commit. Vercel republishes in about a minute. (GitHub's web upload accepts files
  up to 25 MB each.)
- Offline: copy the file into the `downloads` folder and restart
  `start-offline-server.bat`.

The file name (without `.docx`) is shown on the page, so name files the way you
want visitors to see them, e.g. `ቡቡዳጢ Questions Part 1.docx`. To remove a file,
delete it from the folder.

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

## Using it with no internet (local network / Wi-Fi)

One computer runs the site; every phone or computer on the same Wi-Fi or
network cable can open it. No internet is needed — fonts are bundled.

One-time setup on the computer that will host it (while you have internet,
or copy the installer on a USB stick):
1. Install Node.js (LTS) from https://nodejs.org.
2. Download this repository (GitHub → Code → Download ZIP) and unzip it.

Each time:
1. Double-click `start-offline-server.bat` (Windows) or run `./start-offline-server.sh` (Mac/Linux).
2. If Windows Firewall asks, tick **Private networks** and click **Allow access**.
3. The window shows the address, e.g. `http://192.168.1.20:8080`.
   Type that address in the browser on the other phones/computers.
4. Keep the window open while people use the site. Close it to stop.

Tips: set your Wi-Fi as a **Private** network in Windows, otherwise the firewall
may block the others. A phone hotspot works too — no mobile data is used for
the site. To add questions offline, drop the .docx into `questions/` and restart.

## Local preview

```
npm run build        # builds into public/
npm start            # builds and serves on http://localhost:8080 and your local network
```

## Settings

`site.config.json` holds the public site address (`siteUrl`), the site name, home page title and description, ID prefix, number of digits in IDs, and
the IndexNow key (the same key must stay in place once in use).
