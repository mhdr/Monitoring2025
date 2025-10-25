/**
 * PM2 Ecosystem Configuration for EMS3 UI
 * 
 * Manages the Express.js server as a background process
 * with auto-restart, logging, and monitoring capabilities
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ems3-ui
 *   pm2 stop ems3-ui
 *   pm2 delete ems3-ui
 *   pm2 logs ems3-ui
 *   pm2 monit
 */

module.exports = {
  apps: [{
    name: 'ems3-ui',
    script: './server.cjs',
    
    // Instance configuration
    instances: 1, // Single instance (can be changed to 'max' for clustering)
    exec_mode: 'fork', // 'cluster' for multiple instances
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    
    // Auto-restart configuration
    autorestart: true,
    watch: false, // Set to true for development auto-reload
    max_memory_restart: '500M', // Restart if memory exceeds 500MB
    
    // Restart behavior
    min_uptime: '10s', // Minimum uptime before considered stable
    max_restarts: 10, // Maximum restarts within 1 minute before stopping
    restart_delay: 4000, // Wait 4 seconds before restart
    
    // Logging
    error_file: './logs/ems3-ui-error.log',
    out_file: './logs/ems3-ui-out.log',
    log_file: './logs/ems3-ui-combined.log',
    time: true, // Prefix logs with timestamp
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Log rotation
    log_type: 'json', // Can be 'json' or null for plain text
    merge_logs: true,
    
    // Advanced features
    kill_timeout: 5000, // Wait 5 seconds for graceful shutdown
    listen_timeout: 3000, // Wait 3 seconds for server to start
    shutdown_with_message: true,
    
    // Process monitoring
    pmx: true,
    automation: false,
    
    // Cron restart (optional - restart daily at 3 AM)
    // cron_restart: '0 3 * * *',
    
    // Arguments
    // args: [],
    
    // Node.js arguments
    node_args: [
      '--max-old-space-size=512' // Limit Node.js memory to 512MB
    ],
    
    // Source map support (for better error traces)
    source_map_support: false,
    
    // Disable automatic instance_var
    instance_var: 'INSTANCE_ID',
    
    // Interpreter
    interpreter: 'node',
    
    // Force color output
    force: true,
    
    // Post-deploy hooks (optional)
    // post_update: ['npm install', 'npm run build'],
    
    // Deployment configuration (optional)
    // deploy: {
    //   production: {
    //     user: 'ubuntu',
    //     host: 'your-server.com',
    //     ref: 'origin/main',
    //     repo: 'git@github.com:your-repo.git',
    //     path: '/var/www/ems3/ui',
    //     'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    //   }
    // }
  }]
};
