module.exports = {
  apps: [
    {
      name: 'tm-api',
      cwd: '/opt/training-market/apps/api',
      script: 'npx',
      args: 'tsx src/server.ts',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/tm-api-error.log',
      out_file: '/var/log/pm2/tm-api-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'tm-web',
      cwd: '/opt/training-market/apps/web',
      script: 'npx',
      args: 'next start --port 3000',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/tm-web-error.log',
      out_file: '/var/log/pm2/tm-web-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
