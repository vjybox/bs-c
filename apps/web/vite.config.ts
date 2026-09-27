import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const LIVE_API = path.resolve(__dirname, "src/api.ts");
const DEMO_API = path.resolve(__dirname, "src/api.demo.ts");

/**
 * Swaps the single networking module for its in-memory twin in the static demo build.
 * A resolver rather than `resolve.alias` because pages import the relative specifier
 * "../api", which aliases match unreliably across directory depths.
 */
function useDemoApi(): Plugin {
  return {
    name: "use-demo-api",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || source.includes("api.demo")) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved && path.resolve(resolved.id) === LIVE_API) return DEMO_API;
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === "demo";
  return {
    // Artifact hosting serves the page from a nested path, so assets must be relative.
    base: demo ? "./" : "/",
    plugins: [...(demo ? [useDemoApi()] : []), react()],
    define: {
      "import.meta.env.VITE_DEMO_MODE": JSON.stringify(demo ? "true" : "false"),
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
    // `vite preview` does not inherit server.proxy, and the offline tests run against a
    // real production build rather than the dev server.
    preview: {
      proxy: {
        "/api": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
      },
    },
  };
});
