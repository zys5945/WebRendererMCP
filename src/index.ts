#!/usr/bin/env node

import { chromium, Browser, Page } from "playwright";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

let BROWSER: Browser | null = null;
const PAGES: { [tabId: string]: WeakRef<Page> } = {};

const server = new McpServer({
  name: "WebRenderer",
  version: "1.0.0",
});

const SCHEMA = {
  pageId: z
    .string()
    .describe(
      "ID of the page to use for rendering. Using the same ID will reuse the same page"
    ),
  html: z.string().describe("HTML to render"),
};

server.tool(
  "renderHTML",
  "Renders the given HTML in a playwright page. Returns a single text response indicating success or errors",
  SCHEMA,
  async ({ pageId, html }) => {
    try {
      if (!BROWSER) {
        BROWSER = await chromium.launch({ headless: false });
      }

      let page = PAGES[pageId]?.deref();
      if (!page) {
        page = await BROWSER.newPage();
        PAGES[pageId] = new WeakRef(page);
      }

      await page.setContent(html);

      return {
        content: [{ type: "text", text: "success" }],
        isError: false,
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: String(e) }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
