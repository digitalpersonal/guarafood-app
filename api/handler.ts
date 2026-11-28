import type { IncomingMessage, ServerResponse } from "http";
import { createApiApp } from "../apiApp";

const apiApp = createApiApp();

export default function handler(req: IncomingMessage & { url?: string; originalUrl?: string; query?: Record<string, any> }, res: ServerResponse) {
  try {
    const parsedUrl = new URL(req.url || "/", "http://localhost");
    const apiPathParam =
      parsedUrl.searchParams.get("__api_path") ??
      (typeof req.query?.__api_path === "string" ? req.query.__api_path : undefined);

    if (apiPathParam !== undefined && apiPathParam !== null) {
      parsedUrl.searchParams.delete("__api_path");
      const remainingQs = parsedUrl.searchParams.toString();
      const normalizedPath = `/api/${String(apiPathParam).replace(/^\/+/, "")}`;
      const nextUrl = remainingQs ? `${normalizedPath}?${remainingQs}` : normalizedPath;
      req.url = nextUrl;
      req.originalUrl = nextUrl;
    }
  } catch {
    // Keep original req.url if URL parsing fails
  }

  return new Promise<void>((resolve, reject) => {
    res.once("finish", () => resolve());
    res.once("close", () => resolve());
    (apiApp as any)(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
