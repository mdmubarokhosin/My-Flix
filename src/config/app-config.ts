// Single source of truth for app version. Reads from package.json at build time
// (Next.js inlines process.env.NODE_ENV, so we hardcode here but keep in sync
// with package.json). Keep this string equal to package.json's "version".

export const APP_CONFIG = {
  name: "MyFlix Admin",
  // Must match package.json "version".
  version: "2.0.0",
  copyright: `© ${new Date().getFullYear()}, MyFlix Admin.`,
};
