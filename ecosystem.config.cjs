const fs = require("fs");
const path = require("path");

function readDotEnvKey(keyName) {
  const regex = new RegExp(`^(?:export\\s+)?${keyName}\\s*=\\s*["']?([^"'\\r\\n]+)["']?\\s*$`);
  for (const file of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    try {
      const fullPath = path.join(__dirname, file);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, "utf8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const match = line.match(regex);
        if (match) {
          return match[1].trim();
        }
      }
    } catch {
      // Ignore unreadable env files
    }
  }
  return null;
}

const port = Number(readDotEnvKey("PORT")) || Number(process.env.APP_PORT) || 3003;
const redisUrl = readDotEnvKey("REDIS_URL") || process.env.REDIS_URL || "redis://127.0.0.1:6379";

module.exports = {
  apps: [
    {
      name: "classicconcepts",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${port}`,
      instances: 1,
      exec_mode: "fork",
      // Trigger V8 garbage collection proactively before exhausting VPS RAM
      node_args: "--max-old-space-size=768",
      // Auto-restart gracefully if RSS exceeds 900MB instead of hitting Linux OOM killer (502)
      max_memory_restart: "900M",
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: port,
        REDIS_URL: redisUrl,
        REDIS_MAXMEMORY_BYTES: "104857600", // Strict 100MB in-memory cache ceiling
      },
    },
  ],
};
