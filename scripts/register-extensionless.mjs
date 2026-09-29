// Usage: node --import ./scripts/register-extensionless.mjs <script>
import { register } from "node:module";

register("./esm-extensionless-hooks.mjs", import.meta.url);
