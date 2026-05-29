import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - api, _next, _vercel, files with an extension
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
