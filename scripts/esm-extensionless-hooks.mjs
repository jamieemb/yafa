// Node module-resolution hook: retry a failed relative import with a
// ".js" extension. @material/material-color-utilities ships ESM with
// extensionless internal imports (fine for bundlers, not for Node), and
// scripts/generate-pwa-assets.mjs needs it to derive the app's colours.
// Registered by scripts/register-extensionless.mjs.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasExt = /\.[a-z]+$/i.test(specifier);
    if (err?.code === "ERR_MODULE_NOT_FOUND" && relative && !hasExt) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw err;
  }
}
