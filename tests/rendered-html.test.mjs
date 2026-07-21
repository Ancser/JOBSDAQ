import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the JOBSDAQ product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>JOBSDAQ — The Market for Human Skills<\/title>/i);
  assert.match(html, /ancser/);
  assert.match(html, /JOBSDAQ/);
  assert.match(html, />Market</);
  assert.match(html, />Heat Map</);
  assert.match(html, />Portfolio</);
  assert.match(html, />Application</);
  assert.match(html, /GREENHOUSE API/);
  assert.match(html, /FIGMA/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("removes starter preview assets and ships product metadata", async () => {
  const [page, layout, packageJson, og, favicon] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    stat(new URL("../public/og.png", import.meta.url)),
    stat(new URL("../public/favicon.ico", import.meta.url)),
  ]);

  assert.match(page, /Greenhouse/);
  assert.match(page, /Prompt Engineering/);
  assert.match(page, /PERSONAL SKILLS/);
  assert.match(page, /APPLICATION HISTORY/);
  assert.match(page, /FACT-SAFE TAILORING/);
  assert.match(page, /Deyu Huang/);
  assert.match(layout, /JOBSDAQ — The Market for Human Skills/);
  assert.match(layout, /\/og\.png/);
  assert.match(packageJson, /"name": "jobsdaq"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.ok(og.size > 100_000);
  assert.ok(favicon.size > 1_000);

  await assert.rejects(
    access(new URL("app/_sites-preview", templateRoot)),
  );
});
