#!/bin/bash

set -o pipefail  # Catch errors in pipes

# Configuration
app_name=ems3-ui
app_port=3000
log_dir=./logs
backup_dir=./backups
https_config=".https-config"

# Colors
color_green='\033[0;32m'
color_red='\033[0;31m'
color_yellow='\033[0;33m'
color_blue='\033[0;34m'
color_nocolor='\033[0m'
bypass_user_selection=0

if [[ $# -gt 0 ]]; then
    bypass_user_selection=1
    operation=$1
fi

# Enhanced echo with color and logging
echo_color(){
    echo -e "${2}${1}${color_nocolor}"
}

echo_info(){
    echo_color "$1" ${color_blue}
}

echo_success(){
    echo_color "✓ $1" ${color_green}
}

echo_warning(){
    echo_color "⚠ $1" ${color_yellow}
}

echo_error(){
    echo_color "✗ $1" ${color_red}
}

# Timestamp function
timestamp(){
    date +'%Y-%m-%d %H:%M:%S'
}

# Check if PM2 is available
check_pm2(){
    if ! command -v pm2 &> /dev/null; then
        echo_error "PM2 is not installed!"
        echo "Install with: npm install -g pm2"
        exit 1
    fi
}

# Check if app exists in PM2
check_app_exists(){
    if ! pm2 list | grep -q "${app_name}"; then
        echo_warning "App '${app_name}' is not registered in PM2"
        echo "Run './install.sh' first to deploy the application"
        return 1
    fi
    return 0
}

########################################################### Operation ###############################################################

if [[ ${bypass_user_selection} -eq 0 ]]; then
    echo '========================================'
    echo 'EMS3 UI Management Script (Express + PM2)'
    echo '========================================'
    echo 'Select operation:'
    echo ''
    echo '1  - Deploy (build and restart with PM2)'
    echo '2  - Restart PM2 app'
    echo '3  - Stop PM2 app'
    echo '4  - Start PM2 app'
    echo '5  - PM2 status'
    echo '6  - View error log (last 50 lines)'
    echo '7  - View output log (last 50 lines)'
    echo '8  - Follow error log (live)'
    echo '9  - Follow output log (live)'
    echo '10 - Clean build cache'
    echo '11 - Full deploy (install + build + start)'
    echo '12 - List built files'
    echo '13 - PM2 monitor (interactive)'
    echo '14 - Delete PM2 app'
    echo '15 - Check deployment status'
    echo '16 - Troubleshoot (diagnostic checks)'
    echo '17 - View all PM2 logs'
    echo '18 - Test health endpoint'
    echo '19 - Rotate logs'
    echo '20 - Performance metrics'
    echo '21 - Memory usage report'
    echo '22 - Backup current deployment'
    echo '23 - Restore from backup'
    echo '24 - Zero-downtime deployment'
    echo '25 - Validate configuration'
    echo '26 - Check SSL certificates'
    echo ''
    echo 'HTTPS Deployment (Reverse Proxy):'
    echo '27 - Deploy with HTTPS'
    echo '28 - Configure HTTPS URLs'
    echo '29 - Show HTTPS configuration'
    echo '30 - Configure Apache (auto-setup with WebSocket)'
    echo ''

    read -p 'Enter operation number: ' operation
fi

########################################################### App ####################################################################

# operation: 1
app_deploy(){
    echo_info "[$(timestamp)] Building and deploying..."
    dos2unix install.sh 2>/dev/null || true
    chmod +x install.sh
    if ./install.sh; then
        echo_success "Deployment completed successfully"
    else
        echo_error "Deployment failed"
        exit 1
    fi
}

# operation: 2
app_restart(){
    check_pm2
    check_app_exists || exit 1
    
    echo_info "[$(timestamp)] Restarting PM2 app..."
    if pm2 restart ${app_name}; then
        echo_success "App restarted successfully"
        sleep 2
        pm2 info ${app_name}
    else
        echo_error "Failed to restart app"
        exit 1
    fi
}

# operation: 3
app_stop(){
    check_pm2
    check_app_exists || exit 1
    
    echo_info "[$(timestamp)] Stopping PM2 app..."
    if pm2 stop ${app_name}; then
        echo_success "App stopped successfully"
    else
        echo_error "Failed to stop app"
        exit 1
    fi
}

# operation: 4
app_start(){
    check_pm2
    
    echo_info "[$(timestamp)] Starting PM2 app..."
    if pm2 start ${app_name}; then
        echo_success "App started successfully"
        sleep 2
        pm2 info ${app_name}
    else
        echo_error "Failed to start app"
        exit 1
    fi
}

# operation: 5
app_status(){
    check_pm2
    pm2 status
    echo ""
    if check_app_exists; then
        pm2 info ${app_name}
    fi
}

# operation: 6
app_error_log(){
    echo_color "Last 50 lines of error log:" ${color_yellow}
    if [ -f "${log_dir}/${app_name}-error.log" ]; then
        tail -n 50 ${log_dir}/${app_name}-error.log
    else
        echo_warning "Log file not found: ${log_dir}/${app_name}-error.log"
        echo_info "Using PM2 logs instead:"
        check_pm2 && pm2 logs ${app_name} --err --lines 50 --nostream
    fi
}

# operation: 7
app_output_log(){
    echo_color "Last 50 lines of output log:" ${color_yellow}
    if [ -f "${log_dir}/${app_name}-out.log" ]; then
        tail -n 50 ${log_dir}/${app_name}-out.log
    else
        echo_warning "Log file not found: ${log_dir}/${app_name}-out.log"
        echo_info "Using PM2 logs instead:"
        check_pm2 && pm2 logs ${app_name} --out --lines 50 --nostream
    fi
}

# operation: 8
app_error_log_live(){
    echo_color "Following error log (Ctrl+C to stop)..." ${color_yellow}
    if [ -f "${log_dir}/${app_name}-error.log" ]; then
        tail -f ${log_dir}/${app_name}-error.log
    else
        echo_warning "Log file not found. Using PM2 logs instead:"
        check_pm2 && pm2 logs ${app_name} --err --lines 50
    fi
}

# operation: 9
app_output_log_live(){
    echo_color "Following output log (Ctrl+C to stop)..." ${color_yellow}
    if [ -f "${log_dir}/${app_name}-out.log" ]; then
        tail -f ${log_dir}/${app_name}-out.log
    else
        echo_warning "Log file not found. Using PM2 logs instead:"
        check_pm2 && pm2 logs ${app_name} --out --lines 50
    fi
}

# operation: 10
app_clean(){
    echo_info "[$(timestamp)] Cleaning build artifacts..."
    rm -rf dist/
    rm -rf node_modules/.vite/
    echo_success "Build cache cleaned"
    
    if [ -d "dist" ] || [ -d "node_modules/.vite" ]; then
        echo_error "Failed to clean all artifacts"
        exit 1
    fi
}

# operation: 11
app_full_deploy(){
    echo_info "=== Full Deployment ==="
    echo ""
    app_clean
    echo ""
    echo_info "Installing dependencies..."
    if npm install; then
        echo_success "Dependencies installed"
    else
        echo_error "Failed to install dependencies"
        exit 1
    fi
    echo ""
    app_deploy
}

# operation: 12
app_list_files(){
    echo_color "Built files in dist/:" ${color_yellow}
    if [ -d "dist" ]; then
        ls -lah dist/
        echo ""
        echo_info "Total size:"
        du -sh dist/
        echo ""
        echo_info "File breakdown:"
        find dist -type f -name "*.js" -exec du -sh {} \; | sort -h | tail -10
    else
        echo_error "dist directory does not exist"
        echo_info "Run './install.sh' or './manager.sh' option 1 to build"
    fi
}

# operation: 13
app_monitor(){
    check_pm2
    echo_info "Opening PM2 monitor (press Ctrl+C to exit)..."
    pm2 monit
}

# operation: 14
app_delete(){
    check_pm2
    check_app_exists || exit 1
    
    echo_warning "This will delete the PM2 app '${app_name}'"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo_info "[$(timestamp)] Deleting PM2 app..."
        if pm2 delete ${app_name}; then
            echo_success "App deleted successfully"
        else
            echo_error "Failed to delete app"
            exit 1
        fi
    else
        echo_info "Operation cancelled"
    fi
}

# operation: 15
app_check_status(){
    echo_color "=== Deployment Status ===" ${color_yellow}
    echo ""
    
    # Check Node.js
    echo_info "Node.js Status:"
    if command -v node &> /dev/null; then
        echo_success "Node.js is installed ($(node --version))"
    else
        echo_error "Node.js is not installed"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        echo_success "npm is installed ($(npm --version))"
    else
        echo_error "npm is not installed"
    fi
    
    # Check PM2
    echo ""
    echo_info "PM2 Status:"
    if command -v pm2 &> /dev/null; then
        echo_success "PM2 is installed ($(pm2 --version))"
    else
        echo_error "PM2 is not installed"
    fi
    
    # Check app status
    echo ""
    echo_info "Application Status:"
    if command -v pm2 &> /dev/null && pm2 list | grep -q "${app_name}"; then
        if pm2 list | grep "${app_name}" | grep -q "online"; then
            echo_success "App is running"
            echo ""
            pm2 info ${app_name} | grep -E "status|uptime|restarts|cpu|memory|script"
        else
            echo_error "App is registered but not running"
            pm2 describe ${app_name} | grep -E "status|exit code|error"
        fi
    else
        echo_error "App is not registered in PM2"
    fi
    
    # Check build directory
    echo ""
    echo_info "Build Directory:"
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        echo_success "Files built in dist/"
        file_count=$(find dist -type f | wc -l)
        dir_size=$(du -sh dist 2>/dev/null | cut -f1)
        echo "  Files: ${file_count}"
        echo "  Size: ${dir_size}"
        echo "  Last build: $(stat -c %y dist/index.html 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" dist/index.html 2>/dev/null)"
    else
        echo_error "No build found"
    fi
    
    # Check .env.production
    echo ""
    echo_info "Configuration:"
    if [ -f ".env.production" ]; then
        echo_success ".env.production exists"
        if grep -q "VITE_API_BASE_URL" .env.production; then
            api_url=$(grep "VITE_API_BASE_URL" .env.production | cut -d'=' -f2)
            echo "  API URL: ${api_url}"
        fi
    else
        echo_error ".env.production not found"
    fi
    
    # Check logs
    echo ""
    echo_info "Logs Directory:"
    if [ -d "${log_dir}" ]; then
        echo_success "Logs directory exists"
        if [ -f "${log_dir}/${app_name}-error.log" ]; then
            error_size=$(du -sh ${log_dir}/${app_name}-error.log 2>/dev/null | cut -f1)
            error_lines=$(wc -l < ${log_dir}/${app_name}-error.log 2>/dev/null || echo "0")
            echo "  Error log: ${error_size} (${error_lines} lines)"
        fi
        if [ -f "${log_dir}/${app_name}-out.log" ]; then
            out_size=$(du -sh ${log_dir}/${app_name}-out.log 2>/dev/null | cut -f1)
            out_lines=$(wc -l < ${log_dir}/${app_name}-out.log 2>/dev/null || echo "0")
            echo "  Output log: ${out_size} (${out_lines} lines)"
        fi
    else
        echo_error "Logs directory not found"
    fi
    
    # Show access URLs
    echo ""
    echo_info "Access URLs:"
    echo "  http://localhost:${app_port}"
    local_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ -n "$local_ip" ]; then
        echo "  http://${local_ip}:${app_port}"
    fi
    echo ""
    echo "Health check:"
    echo "  http://localhost:${app_port}/health"
}

app_troubleshoot(){
    echo_color "Running diagnostic checks..." ${color_yellow}
    if [ -f "scripts/troubleshoot.sh" ]; then
        bash scripts/troubleshoot.sh
    else
        echo_error "Troubleshoot script not found"
        echo_info "Expected: scripts/troubleshoot.sh"
        echo ""
        echo_info "Running basic diagnostics..."
        echo ""
        
        # Port check
        echo_info "Checking port ${app_port}..."
        if command -v netstat &> /dev/null; then
            if netstat -tuln | grep -q ":${app_port} "; then
                echo_success "Port ${app_port} is in use"
            else
                echo_warning "Port ${app_port} is not in use"
            fi
        fi
        
        # Process check
        echo ""
        echo_info "Checking PM2 processes..."
        pm2 list 2>/dev/null || echo_error "PM2 not available"
        
        # Disk space
        echo ""
        echo_info "Disk space:"
        df -h . | tail -1
    fi
}

app_view_logs(){
    check_pm2
    echo_info "Viewing all PM2 logs for ${app_name}..."
    pm2 logs ${app_name} --lines 100
}

app_test_health(){
    echo_info "Testing health endpoints..."
    echo ""
    
    # Test frontend health
    echo "Frontend health (http://localhost:${app_port}/health):"
    if health_response=$(curl -s http://localhost:${app_port}/health 2>/dev/null); then
        echo_success "Frontend is responding"
        echo "$health_response" | head -3
    else
        echo_error "Frontend is not responding"
    fi
    echo ""
    
    # Test frontend root
    echo "Frontend root (http://localhost:${app_port}):"
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${app_port} 2>/dev/null)
    if [ "$http_code" = "200" ] || [ "$http_code" = "304" ]; then
        echo_success "Frontend root is accessible (HTTP ${http_code})"
    else
        echo_error "Frontend root returned HTTP ${http_code}"
    fi
    echo ""
    
    # Test backend API (if available)
    echo "Backend API (http://localhost:5030/health):"
    if backend_response=$(curl -s http://localhost:5030/health 2>/dev/null); then
        echo_success "Backend API is responding"
        echo "$backend_response" | head -3
    else
        echo_error "Backend API is not responding"
    fi
    echo ""
}

# operation: 19 - Rotate logs
app_rotate_logs(){
    echo_info "[$(timestamp)] Rotating logs..."
    
    if [ ! -d "${log_dir}" ]; then
        echo_error "Log directory not found: ${log_dir}"
        exit 1
    fi
    
    rotated_dir="${log_dir}/archive"
    mkdir -p "${rotated_dir}"
    
    timestamp_suffix=$(date +%Y%m%d-%H%M%S)
    
    for log_file in "${log_dir}"/*.log; do
        if [ -f "$log_file" ]; then
            log_basename=$(basename "$log_file")
            log_size=$(du -sh "$log_file" | cut -f1)
            
            # Rotate if larger than 10MB
            if [ "$(stat -c%s "$log_file" 2>/dev/null || echo 0)" -gt 10485760 ]; then
                mv "$log_file" "${rotated_dir}/${log_basename%.log}-${timestamp_suffix}.log"
                echo_success "Rotated $log_basename (${log_size})"
            fi
        fi
    done
    
    # Compress old logs
    find "${rotated_dir}" -name "*.log" -type f -exec gzip {} \;
    
    # Remove logs older than 30 days
    find "${rotated_dir}" -name "*.log.gz" -type f -mtime +30 -delete
    
    echo_success "Log rotation completed"
}

# operation: 20 - Performance metrics
app_performance_metrics(){
    check_pm2
    check_app_exists || exit 1
    
    echo_info "=== Performance Metrics ==="
    echo ""
    
    # PM2 metrics
    echo_info "PM2 Process Metrics:"
    pm2 describe ${app_name} | grep -E "status|uptime|restarts|cpu|memory|created at"
    
    echo ""
    echo_info "System Resources:"
    
    # CPU usage
    if command -v top &> /dev/null; then
        cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        echo "  CPU Usage: ${cpu_usage}%"
    fi
    
    # Memory usage
    if command -v free &> /dev/null; then
        mem_total=$(free -h | grep "Mem:" | awk '{print $2}')
        mem_used=$(free -h | grep "Mem:" | awk '{print $3}')
        mem_free=$(free -h | grep "Mem:" | awk '{print $4}')
        echo "  Memory: ${mem_used} / ${mem_total} (${mem_free} free)"
    fi
    
    # Disk usage
    disk_usage=$(df -h . | tail -1 | awk '{print $5}')
    echo "  Disk Usage: ${disk_usage}"
    
    echo ""
    echo_info "Application Metrics:"
    
    # Response time test
    if command -v curl &> /dev/null; then
        response_time=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:${app_port}/health 2>/dev/null)
        if [ -n "$response_time" ]; then
            echo "  Health endpoint response: ${response_time}s"
        fi
    fi
    
    # Request count from logs (last hour)
    if [ -f "${log_dir}/${app_name}-out.log" ]; then
        one_hour_ago=$(date -d '1 hour ago' '+%Y-%m-%d %H' 2>/dev/null || date -v-1H '+%Y-%m-%d %H' 2>/dev/null)
        if [ -n "$one_hour_ago" ]; then
            request_count=$(grep -c "$one_hour_ago" "${log_dir}/${app_name}-out.log" 2>/dev/null || echo "N/A")
            echo "  Requests (last hour): ${request_count}"
        fi
    fi
}

# operation: 21 - Memory usage report
app_memory_report(){
    check_pm2
    check_app_exists || exit 1
    
    echo_info "=== Memory Usage Report ==="
    echo ""
    
    # Get PM2 memory info
    mem_usage=$(pm2 describe ${app_name} | grep "memory" | awk '{print $3}')
    echo_info "Application Memory Usage: ${mem_usage}"
    
    echo ""
    echo_info "System Memory:"
    free -h
    
    echo ""
    echo_info "Top Memory Consumers:"
    ps aux --sort=-%mem | head -10
    
    # Memory threshold check (alert if over 500MB)
    mem_mb=$(pm2 jlist | grep -A10 "\"name\":\"${app_name}\"" | grep "\"memory\"" | grep -oP '\d+' | head -1)
    if [ -n "$mem_mb" ] && [ "$mem_mb" -gt 524288000 ]; then
        echo ""
        echo_warning "Memory usage is high (>500MB). Consider restarting the application."
    fi
}

# operation: 22 - Backup current deployment
app_backup(){
    echo_info "[$(timestamp)] Creating backup..."
    
    if [ ! -d "dist" ]; then
        echo_error "No dist directory to backup"
        exit 1
    fi
    
    mkdir -p "$backup_dir"
    backup_name="deployment-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    echo_info "Backing up dist directory and configuration..."
    tar -czf "${backup_dir}/${backup_name}" dist/ .env.production ecosystem.config.cjs 2>/dev/null
    
    if [ -f "${backup_dir}/${backup_name}" ]; then
        backup_size=$(du -sh "${backup_dir}/${backup_name}" | cut -f1)
        echo_success "Backup created: ${backup_name} (${backup_size})"
        
        # Keep only last 10 backups
        backup_count=$(ls -1 "$backup_dir"/deployment-backup-*.tar.gz 2>/dev/null | wc -l)
        if [ "$backup_count" -gt 10 ]; then
            echo_info "Cleaning old backups (keeping last 10)..."
            ls -1t "$backup_dir"/deployment-backup-*.tar.gz | tail -n +11 | xargs rm -f
        fi
    else
        echo_error "Failed to create backup"
        exit 1
    fi
}

# operation: 23 - Restore from backup
app_restore(){
    echo_info "Available backups:"
    
    if [ ! -d "$backup_dir" ] || [ -z "$(ls -A $backup_dir/*.tar.gz 2>/dev/null)" ]; then
        echo_error "No backups found in ${backup_dir}"
        exit 1
    fi
    
    ls -lh "$backup_dir"/*.tar.gz | awk '{print NR": "$9" ("$5")"}'
    
    echo ""
    read -p "Enter backup number to restore (or 0 to cancel): " backup_num
    
    if [ "$backup_num" = "0" ]; then
        echo_info "Restore cancelled"
        exit 0
    fi
    
    backup_file=$(ls -1t "$backup_dir"/*.tar.gz | sed -n "${backup_num}p")
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        echo_error "Invalid backup selection"
        exit 1
    fi
    
    echo_warning "This will replace current deployment with: $(basename $backup_file)"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        check_pm2 && check_app_exists && app_stop
        
        echo_info "Restoring backup..."
        tar -xzf "$backup_file" -C .
        
        echo_success "Backup restored successfully"
        echo_info "Starting application..."
        app_start
    else
        echo_info "Restore cancelled"
    fi
}

# operation: 24 - Zero-downtime deployment
app_zero_downtime_deploy(){
    check_pm2
    
    echo_info "=== Zero-Downtime Deployment ==="
    echo ""
    
    # Backup first
    app_backup
    echo ""
    
    # Build without stopping
    echo_info "Building new version..."
    if npm run build; then
        echo_success "Build completed"
    else
        echo_error "Build failed"
        exit 1
    fi
    
    # Reload with PM2 (zero-downtime)
    echo ""
    echo_info "Reloading application (zero-downtime)..."
    if pm2 reload ${app_name}; then
        echo_success "Application reloaded successfully"
        sleep 2
        pm2 info ${app_name}
    else
        echo_error "Reload failed, attempting regular restart..."
        app_restart
    fi
}

# operation: 25 - Validate configuration
app_validate_config(){
    echo_info "=== Configuration Validation ==="
    echo ""
    
    # Check .env.production
    echo_info "Checking .env.production..."
    if [ -f ".env.production" ]; then
        echo_success ".env.production exists"
        
        if grep -q "VITE_API_BASE_URL" .env.production; then
            echo_success "VITE_API_BASE_URL is set"
            api_url=$(grep "VITE_API_BASE_URL" .env.production | cut -d'=' -f2)
            echo "  Value: ${api_url}"
        else
            echo_error "VITE_API_BASE_URL is missing"
        fi
    else
        echo_error ".env.production not found"
    fi
    
    echo ""
    echo_info "Checking ecosystem.config.cjs..."
    if [ -f "ecosystem.config.cjs" ]; then
        echo_success "ecosystem.config.cjs exists"
        
        if grep -q "name.*${app_name}" ecosystem.config.cjs; then
            echo_success "App name is configured"
        else
            echo_warning "App name not found in config"
        fi
        
        if grep -q "script.*server.cjs" ecosystem.config.cjs; then
            echo_success "Script path is configured"
        else
            echo_error "Script path not found"
        fi
    else
        echo_error "ecosystem.config.cjs not found"
    fi
    
    echo ""
    echo_info "Checking server.cjs..."
    if [ -f "server.cjs" ]; then
        echo_success "server.cjs exists"
    else
        echo_error "server.cjs not found"
    fi
    
    echo ""
    echo_info "Checking package.json..."
    if [ -f "package.json" ]; then
        echo_success "package.json exists"
        
        if grep -q "\"build\":" package.json; then
            echo_success "Build script is defined"
        fi
        
        if grep -q "\"vite\":" package.json; then
            echo_success "Vite is in dependencies"
        fi
    else
        echo_error "package.json not found"
    fi
}

# operation: 26 - Check SSL certificates
app_check_ssl(){
    echo_info "=== SSL Certificate Check ==="
    echo ""
    
    if [ -f "scripts/check-ssl.cjs" ]; then
        echo_info "Running SSL certificate checks..."
        node scripts/check-ssl.cjs
    else
        echo_warning "SSL check script not found (scripts/check-ssl.cjs)"
        echo_info "Performing basic SSL checks..."
        echo ""
        
        # Check if backend has SSL
        backend_url=$(grep "VITE_API_BASE_URL" .env.production 2>/dev/null | cut -d'=' -f2)
        if [ -n "$backend_url" ] && [[ $backend_url == https://* ]]; then
            domain=$(echo "$backend_url" | sed 's|https://||' | cut -d':' -f1)
            echo_info "Checking SSL certificate for: ${domain}"
            
            if command -v openssl &> /dev/null; then
                cert_info=$(echo | openssl s_client -servername "$domain" -connect "${domain}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
                if [ -n "$cert_info" ]; then
                    echo "$cert_info"
                else
                    echo_error "Could not retrieve SSL certificate"
                fi
            else
                echo_warning "openssl not available"
            fi
        else
            echo_info "Backend is using HTTP (no SSL)"
        fi
    fi
}

########################################################### HTTPS Functions ########################################################

# Validate URL format
validate_url(){
    local url=$1
    if [[ $url =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

# operation: 30 - Configure Apache with WebSocket support
configure_apache(){
    echo_color "=== Apache Configuration for HTTPS + WebSocket ===" ${color_yellow}
    echo ""
    
    # Check if running on Ubuntu/Debian
    if ! command -v a2enmod &> /dev/null; then
        echo_error "Apache2 utilities (a2enmod) not found"
        echo_info "This script is designed for Ubuntu/Debian systems"
        echo_info "For other systems, please configure Apache manually"
        exit 1
    fi
    
    # Check if Apache is installed
    if ! command -v apache2 &> /dev/null; then
        echo_error "Apache2 is not installed"
        echo_info "Install with: sudo apt update && sudo apt install apache2"
        exit 1
    fi
    
    echo_info "Detected Apache2 installation"
    echo ""
    
    # Load HTTPS configuration
    if [ ! -f "$https_config" ]; then
        echo_warning "HTTPS not configured yet"
        echo_info "Let's configure it now..."
        echo ""
        configure_https
        echo ""
    fi
    
    source "$https_config"
    
    # Extract domain from API URL
    api_domain=$(echo "$API_HTTPS_URL" | sed -E 's|^https?://||' | cut -d'/' -f1 | cut -d':' -f1)
    ui_domain=$(echo "$UI_HTTPS_URL" | sed -E 's|^https?://||' | cut -d'/' -f1 | cut -d':' -f1)
    
    echo_info "Configuration Summary:"
    echo "  UI Domain:  ${ui_domain}"
    echo "  API Domain: ${api_domain}"
    echo ""
    
    # Step 1: Enable required Apache modules
    echo_color "=== Step 1: Enable Apache Modules ===" ${color_blue}
    echo ""
    
    modules=("proxy" "proxy_http" "proxy_wstunnel" "rewrite" "ssl" "headers")
    
    for module in "${modules[@]}"; do
        if sudo a2enmod "$module" 2>/dev/null; then
            echo_success "Enabled module: ${module}"
        else
            echo_info "Module already enabled: ${module}"
        fi
    done
    
    echo ""
    
    # Step 2: Generate virtual host configurations
    echo_color "=== Step 2: Generate Virtual Host Configurations ===" ${color_blue}
    echo ""
    
    # Determine certificate paths
    read -p "Enter SSL certificate path [/etc/letsencrypt/live/${api_domain}/fullchain.pem]: " cert_path
    cert_path=${cert_path:-/etc/letsencrypt/live/${api_domain}/fullchain.pem}
    
    read -p "Enter SSL certificate key path [/etc/letsencrypt/live/${api_domain}/privkey.pem]: " key_path
    key_path=${key_path:-/etc/letsencrypt/live/${api_domain}/privkey.pem}
    
    echo ""
    
    # Get absolute path to dist directory
    dist_path="$(pwd)/dist"
    
    # Generate API virtual host
    api_vhost="/tmp/api-${api_domain}.conf"
    
    cat > "$api_vhost" << EOF
# Backend API (proxy to .NET Core with WebSocket support)
# Generated by manager.sh on $(date)
<VirtualHost *:443>
    ServerName ${api_domain}
    
    SSLEngine on
    SSLCertificateFile ${cert_path}
    SSLCertificateKeyFile ${key_path}
    
    # Enable RewriteEngine for WebSocket detection
    RewriteEngine On
    
    # CRITICAL: WebSocket support for SignalR
    # Detect WebSocket upgrade requests and proxy to ws://
    # This MUST come BEFORE ProxyPass directives
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/(.*)$ ws://localhost:5030/\$1 [P,L]
    
    # Regular HTTP/HTTPS proxy
    ProxyPreserveHost On
    ProxyPass / http://localhost:5030/
    ProxyPassReverse / http://localhost:5030/
    
    # Forward headers for proper client IP detection
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"
    
    ErrorLog \${APACHE_LOG_DIR}/${api_domain}-error.log
    CustomLog \${APACHE_LOG_DIR}/${api_domain}-access.log combined
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName ${api_domain}
    Redirect permanent / https://${api_domain}/
</VirtualHost>
EOF
    
    echo_success "Generated API virtual host: ${api_vhost}"
    
    # Generate UI virtual host (if different from API domain)
    if [ "$ui_domain" != "$api_domain" ]; then
        ui_vhost="/tmp/ui-${ui_domain}.conf"
        
        read -p "Enter SSL certificate path for UI [/etc/letsencrypt/live/${ui_domain}/fullchain.pem]: " ui_cert_path
        ui_cert_path=${ui_cert_path:-/etc/letsencrypt/live/${ui_domain}/fullchain.pem}
        
        read -p "Enter SSL certificate key path for UI [/etc/letsencrypt/live/${ui_domain}/privkey.pem]: " ui_key_path
        ui_key_path=${ui_key_path:-/etc/letsencrypt/live/${ui_domain}/privkey.pem}
        
        cat > "$ui_vhost" << EOF
# Frontend (serves built React app)
# Generated by manager.sh on $(date)
<VirtualHost *:443>
    ServerName ${ui_domain}
    
    SSLEngine on
    SSLCertificateFile ${ui_cert_path}
    SSLCertificateKeyFile ${ui_key_path}
    
    DocumentRoot ${dist_path}
    
    <Directory ${dist_path}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA routing - redirect all to index.html
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    ErrorLog \${APACHE_LOG_DIR}/${ui_domain}-error.log
    CustomLog \${APACHE_LOG_DIR}/${ui_domain}-access.log combined
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName ${ui_domain}
    Redirect permanent / https://${ui_domain}/
</VirtualHost>
EOF
        
        echo_success "Generated UI virtual host: ${ui_vhost}"
    fi
    
    echo ""
    
    # Step 3: Review and install
    echo_color "=== Step 3: Review Configuration ===" ${color_blue}
    echo ""
    echo_info "API Virtual Host Configuration:"
    echo "-------------------------------------------"
    cat "$api_vhost"
    echo "-------------------------------------------"
    echo ""
    
    if [ -n "$ui_vhost" ]; then
        echo_info "UI Virtual Host Configuration:"
        echo "-------------------------------------------"
        cat "$ui_vhost"
        echo "-------------------------------------------"
        echo ""
    fi
    
    read -p "Install these configurations? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo_info "Configuration cancelled"
        echo_info "Configuration files saved in /tmp for manual review"
        exit 0
    fi
    
    # Install configurations
    echo ""
    echo_color "=== Step 4: Install Configurations ===" ${color_blue}
    echo ""
    
    sudo cp "$api_vhost" "/etc/apache2/sites-available/${api_domain}.conf"
    echo_success "Copied API config to /etc/apache2/sites-available/${api_domain}.conf"
    
    if [ -n "$ui_vhost" ]; then
        sudo cp "$ui_vhost" "/etc/apache2/sites-available/${ui_domain}.conf"
        echo_success "Copied UI config to /etc/apache2/sites-available/${ui_domain}.conf"
    fi
    
    # Enable sites
    sudo a2ensite "${api_domain}.conf"
    echo_success "Enabled site: ${api_domain}"
    
    if [ -n "$ui_vhost" ]; then
        sudo a2ensite "${ui_domain}.conf"
        echo_success "Enabled site: ${ui_domain}"
    fi
    
    echo ""
    
    # Test configuration
    echo_color "=== Step 5: Test Configuration ===" ${color_blue}
    echo ""
    
    if sudo apache2ctl configtest; then
        echo_success "Apache configuration test passed"
        echo ""
        
        read -p "Restart Apache now? (Y/n): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            if sudo systemctl restart apache2; then
                echo_success "Apache restarted successfully"
            else
                echo_error "Failed to restart Apache"
                exit 1
            fi
        else
            echo_warning "Apache NOT restarted - you must restart manually"
            echo_info "Run: sudo systemctl restart apache2"
        fi
    else
        echo_error "Apache configuration test FAILED"
        echo_info "Check the error messages above"
        exit 1
    fi
    
    echo ""
    echo_color "=== Configuration Complete ===" ${color_green}
    echo ""
    echo_info "Apache has been configured with:"
    echo "  ✓ WebSocket support (mod_proxy_wstunnel)"
    echo "  ✓ SSL/TLS encryption"
    echo "  ✓ Automatic HTTP → HTTPS redirect"
    echo "  ✓ SPA routing support"
    echo ""
    echo_info "Access URLs:"
    echo "  Frontend: ${UI_HTTPS_URL}"
    echo "  Backend:  ${API_HTTPS_URL}"
    echo ""
    echo_warning "Important Next Steps:"
    echo "  1. Run option 27 to deploy application with HTTPS"
    echo "  2. Verify SSL certificates are valid"
    echo "  3. Check firewall allows port 443 (HTTPS)"
    echo "  4. Test WebSocket connection in browser DevTools"
    echo ""
    echo_info "Verify modules:"
    echo "  apache2ctl -M | grep proxy_wstunnel"
    echo ""
    echo_info "Monitor logs:"
    echo "  sudo tail -f /var/log/apache2/${api_domain}-error.log"
}

# operation: 28 - Configure HTTPS URLs
configure_https(){
    echo_color "=== HTTPS Configuration ===" ${color_yellow}
    echo ""
    echo_info "This configuration is for reverse proxy setups (nginx/apache)"
    echo_info "Your reverse proxy should already be configured to forward requests"
    echo ""
    
    # Prompt for UI URL
    echo_info "Enter your HTTPS UI URL (where users access the app):"
    echo "  Example: https://monitoring.example.com"
    echo "  Example: https://example.com:8443"
    read -p "UI HTTPS URL: " ui_url
    
    # Validate UI URL
    if ! validate_url "$ui_url"; then
        echo_error "Invalid URL format. URL must start with https:// or http://"
        exit 1
    fi
    
    echo ""
    echo_info "Enter your HTTPS API URL (backend API endpoint):"
    echo "  Example: https://api.example.com"
    echo "  Example: https://api.example.com:5030"
    echo "  Example: https://example.com/api"
    read -p "API HTTPS URL: " api_url
    
    # Validate API URL
    if ! validate_url "$api_url"; then
        echo_error "Invalid URL format. URL must start with https:// or http://"
        exit 1
    fi
    
    echo ""
    echo_info "Configuration Summary:"
    echo "  UI URL:  ${ui_url}"
    echo "  API URL: ${api_url}"
    echo ""
    
    read -p "Save this configuration? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Save configuration
        cat > "$https_config" << EOF
# HTTPS Configuration for Reverse Proxy
# Generated on $(date)

UI_HTTPS_URL=${ui_url}
API_HTTPS_URL=${api_url}
EOF
        
        echo_success "HTTPS configuration saved to ${https_config}"
        echo ""
        echo_info "You can now use option 27 to deploy with HTTPS"
    else
        echo_info "Configuration not saved"
        exit 0
    fi
}

# Generate .env.production with HTTPS URLs
generate_env_https(){
    if [ ! -f "$https_config" ]; then
        echo_error "HTTPS configuration not found: ${https_config}"
        echo_info "Run option 28 to configure HTTPS URLs first"
        exit 1
    fi
    
    # Load HTTPS configuration
    source "$https_config"
    
    if [ -z "$API_HTTPS_URL" ]; then
        echo_error "API_HTTPS_URL not found in configuration"
        exit 1
    fi
    
    echo_info "Generating .env.production with HTTPS configuration..."
    
    # Create .env.production file
    ENV_FILE=".env.production"
    
    cat > "$ENV_FILE" << EOF
# Production Environment Variables (HTTPS)
# Generated on $(date)
# HTTPS Configuration

# Backend API URL (via HTTPS reverse proxy)
VITE_API_BASE_URL=${API_HTTPS_URL}

# Note: Frontend is served via reverse proxy at ${UI_HTTPS_URL}
EOF
    
    echo_success "Created ${ENV_FILE} with HTTPS API URL"
    echo_info "API URL: ${API_HTTPS_URL}"
}

# operation: 29 - Show HTTPS configuration
show_https_config(){
    echo_color "=== HTTPS Configuration ===" ${color_yellow}
    echo ""
    
    if [ ! -f "$https_config" ]; then
        echo_warning "HTTPS not configured yet"
        echo_info "Run option 28 to configure HTTPS URLs"
        echo ""
        return
    fi
    
    # Load and display configuration
    source "$https_config"
    
    echo_info "Current HTTPS Configuration:"
    echo "  UI URL:  ${UI_HTTPS_URL}"
    echo "  API URL: ${API_HTTPS_URL}"
    echo ""
    
    # Check if .env.production matches HTTPS config
    if [ -f ".env.production" ]; then
        current_api=$(grep "VITE_API_BASE_URL" .env.production 2>/dev/null | cut -d'=' -f2)
        echo_info "Current .env.production API URL:"
        echo "  ${current_api}"
        echo ""
        
        if [ "$current_api" = "$API_HTTPS_URL" ]; then
            echo_success "Application is configured for HTTPS"
        else
            echo_warning "Application is NOT using HTTPS API URL"
            echo_info "Run option 27 to deploy with HTTPS"
        fi
    else
        echo_warning ".env.production not found"
    fi
    echo ""
    
    echo_info "Configuration file: ${https_config}"
    echo_info "To reconfigure, run option 28"
}

# operation: 27 - Deploy with HTTPS
app_deploy_https(){
    echo_color "=== HTTPS Deployment ===" ${color_yellow}
    echo ""
    
    # Check if HTTPS is configured
    if [ ! -f "$https_config" ]; then
        echo_warning "HTTPS not configured yet"
        echo_info "Let's configure it now..."
        echo ""
        configure_https
        echo ""
    else
        # Show current config
        source "$https_config"
        echo_info "Using existing HTTPS configuration:"
        echo "  UI URL:  ${UI_HTTPS_URL}"
        echo "  API URL: ${API_HTTPS_URL}"
        echo ""
        
        read -p "Use this configuration? (Y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo_info "Reconfiguring HTTPS..."
            echo ""
            configure_https
            echo ""
        fi
    fi
    
    # Generate .env.production with HTTPS URLs
    generate_env_https
    echo ""
    
    # Important warnings
    echo_color "=== IMPORTANT: Protocol Matching ===" ${color_yellow}
    echo ""
    echo_warning "The API URL protocol MUST match how you access the UI:"
    echo "  • If UI accessed via HTTPS → API URL must be HTTPS"
    echo "  • If UI accessed via HTTP  → API URL must be HTTP"
    echo ""
    echo_info "Current configuration will use:"
    source "$https_config"
    echo "  API URL: ${API_HTTPS_URL}"
    echo ""
    echo_warning "Mixed protocols (HTTPS UI → HTTP API) will cause CORS/security errors!"
    echo ""
    
    read -p "Continue with deployment? (Y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo_info "Deployment cancelled"
        exit 0
    fi
    
    # Deploy using standard deployment
    echo_info "[$(timestamp)] Building and deploying with HTTPS configuration..."
    dos2unix install.sh 2>/dev/null || true
    chmod +x install.sh
    
    if ./install.sh; then
        echo_success "HTTPS deployment completed successfully"
        echo ""
        
        source "$https_config"
        echo_info "Application Access URLs:"
        echo "  Frontend: ${UI_HTTPS_URL}"
        echo "  Backend:  ${API_HTTPS_URL}"
        echo ""
        echo_warning "Make sure your reverse proxy (nginx/apache) is running and configured"
        echo ""
        echo_info "To verify the build is using correct API URL:"
        echo "  1. Open browser DevTools (F12)"
        echo "  2. Go to Network tab"
        echo "  3. Try to login"
        echo "  4. Check the API request URL matches: ${API_HTTPS_URL}"
    else
        echo_error "Deployment failed"
        exit 1
    fi
}

# Execute operation
case ${operation} in
    1)
        app_deploy
        ;;
    2)
        app_restart
        ;;
    3)
        app_stop
        ;;
    4)
        app_start
        ;;
    5)
        app_status
        ;;
    6)
        app_error_log
        ;;
    7)
        app_output_log
        ;;
    8)
        app_error_log_live
        ;;
    9)
        app_output_log_live
        ;;
    10)
        app_clean
        ;;
    11)
        app_full_deploy
        ;;
    12)
        app_list_files
        ;;
    13)
        app_monitor
        ;;
    14)
        app_delete
        ;;
    15)
        app_check_status
        ;;
    16)
        app_troubleshoot
        ;;
    17)
        app_view_logs
        ;;
    18)
        app_test_health
        ;;
    19)
        app_rotate_logs
        ;;
    20)
        app_performance_metrics
        ;;
    21)
        app_memory_report
        ;;
    22)
        app_backup
        ;;
    23)
        app_restore
        ;;
    24)
        app_zero_downtime_deploy
        ;;
    25)
        app_validate_config
        ;;
    26)
        app_check_ssl
        ;;
    27)
        app_deploy_https
        ;;
    28)
        configure_https
        ;;
    29)
        show_https_config
        ;;
    30)
        configure_apache
        ;;
    *)
        echo_error "Invalid operation: ${operation}"
        exit 1
        ;;
esac
