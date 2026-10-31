module.exports = {
  apps: [
    {
      name: "classicconcepts",
      script: "node_modules/next/dist/bin/next",
      args: "start",
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
        PORT: 3000,
      },
    },
  ],
};
