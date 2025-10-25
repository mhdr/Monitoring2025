#!/bin/bash

color_green='\033[0;32m'
color_red='\033[0;31m'
color_yellow='\033[0;33m'
color_nocolor='\033[0m'
bypass_user_selection=0

if [[ $# -gt 0 ]]
then
    bypass_user_selection=1
    operation=$1
fi

echo_color(){
    echo -e "${2}${1}${color_nocolor}"
}

########################################################### Operation ###############################################################

if [[ ${bypass_user_selection} -eq 0 ]]
then
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
    echo ''

    read -p 'Enter operation number: ' operation
fi

########################################################### App ####################################################################

app_name=ems3-ui
app_port=3000
log_dir=./logs

# operation: 1
app_deploy(){
    echo_color "Building and deploying..." ${color_yellow}
    dos2unix install.sh 2>/dev/null || true
    chmod +x install.sh
    ./install.sh
}

# operation: 2
app_restart(){
    echo_color "Restarting PM2 app..." ${color_yellow}
    pm2 restart ${app_name}
    if [ $? -eq 0 ]; then
        echo_color "✓ App restarted successfully" ${color_green}
        pm2 info ${app_name}
    else
        echo_color "✗ Failed to restart app" ${color_red}
    fi
}

# operation: 3
app_stop(){
    echo_color "Stopping PM2 app..." ${color_yellow}
    pm2 stop ${app_name}
    if [ $? -eq 0 ]; then
        echo_color "✓ App stopped successfully" ${color_green}
    else
        echo_color "✗ Failed to stop app" ${color_red}
    fi
}

# operation: 4
app_start(){
    echo_color "Starting PM2 app..." ${color_yellow}
    pm2 start ${app_name}
    if [ $? -eq 0 ]; then
        echo_color "✓ App started successfully" ${color_green}
        pm2 info ${app_name}
    else
        echo_color "✗ Failed to start app" ${color_red}
    fi
}

# operation: 5
app_status(){
    pm2 status
    echo ""
    pm2 info ${app_name}
}

# operation: 6
app_error_log(){
    echo_color "Last 50 lines of error log:" ${color_yellow}
    if [ -f "${log_dir}/${app_name}-error.log" ]; then
        tail -n 50 ${log_dir}/${app_name}-error.log
    else
        echo_color "Log file not found: ${log_dir}/${app_name}-error.log" ${color_red}
    fi
}

# operation: 7
app_output_log(){
    echo_color "Last 50 lines of output log:" ${color_yellow}
    if [ -f "${log_dir}/${app_name}-out.log" ]; then
        tail -n 50 ${log_dir}/${app_name}-out.log
    else
        echo_color "Log file not found: ${log_dir}/${app_name}-out.log" ${color_red}
    fi
}

# operation: 8
app_error_log_live(){
    echo_color "Following error log (Ctrl+C to stop)..." ${color_yellow}
    if [ -f "${log_dir}/${app_name}-error.log" ]; then
        tail -f ${log_dir}/${app_name}-error.log
    else
        echo_color "Log file not found. Using PM2 logs instead:" ${color_yellow}
        pm2 logs ${app_name} --err --lines 50
    fi
}

# operation: 9
app_output_log_live(){
    echo_color "Following output log (Ctrl+C to stop)..." ${color_yellow}
    if [ -f "${log_dir}/${app_name}-out.log" ]; then
        tail -f ${log_dir}/${app_name}-out.log
    else
        echo_color "Log file not found. Using PM2 logs instead:" ${color_yellow}
        pm2 logs ${app_name} --out --lines 50
    fi
}

# operation: 10
app_clean(){
    echo_color "Cleaning build artifacts..." ${color_yellow}
    rm -rf dist/
    rm -rf node_modules/.vite/
    echo_color "✓ Build cache cleaned" ${color_green}
}

# operation: 11
app_full_deploy(){
    echo_color "=== Full Deployment ===" ${color_yellow}
    app_clean
    echo ""
    echo_color "Installing dependencies..." ${color_yellow}
    npm install
    echo ""
    app_deploy
}

# operation: 12
app_list_files(){
    echo_color "Built files in dist/:" ${color_yellow}
    if [ -d "dist" ]; then
        ls -lah dist/
        echo ""
        du -sh dist/
    else
        echo_color "✗ dist directory does not exist" ${color_red}
    fi
}

# operation: 13
app_monitor(){
    echo_color "Opening PM2 monitor (press Ctrl+C to exit)..." ${color_yellow}
    pm2 monit
}

# operation: 14
app_delete(){
    echo_color "Deleting PM2 app..." ${color_yellow}
    pm2 delete ${app_name}
    if [ $? -eq 0 ]; then
        echo_color "✓ App deleted successfully" ${color_green}
    else
        echo_color "✗ Failed to delete app" ${color_red}
    fi
}

# operation: 15
app_check_status(){
    echo_color "=== Deployment Status ===" ${color_yellow}
    echo ""
    
    # Check Node.js
    echo_color "Node.js Status:" ${color_yellow}
    if command -v node &> /dev/null; then
        echo_color "✓ Node.js is installed ($(node --version))" ${color_green}
    else
        echo_color "✗ Node.js is not installed" ${color_red}
    fi
    
    # Check PM2
    echo ""
    echo_color "PM2 Status:" ${color_yellow}
    if command -v pm2 &> /dev/null; then
        echo_color "✓ PM2 is installed ($(pm2 --version))" ${color_green}
    else
        echo_color "✗ PM2 is not installed" ${color_red}
    fi
    
    # Check app status
    echo ""
    echo_color "Application Status:" ${color_yellow}
    if pm2 list | grep -q "${app_name}"; then
        if pm2 list | grep "${app_name}" | grep -q "online"; then
            echo_color "✓ App is running" ${color_green}
            pm2 info ${app_name} | grep -E "status|uptime|restarts|cpu|memory"
        else
            echo_color "✗ App is not running" ${color_red}
        fi
    else
        echo_color "✗ App is not registered in PM2" ${color_red}
    fi
    
    # Check build directory
    echo ""
    echo_color "Build Directory:" ${color_yellow}
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then
        echo_color "✓ Files built in dist/" ${color_green}
        file_count=$(find dist -type f | wc -l)
        dir_size=$(du -sh dist 2>/dev/null | cut -f1)
        echo "  Files: ${file_count}"
        echo "  Size: ${dir_size}"
    else
        echo_color "✗ No build found" ${color_red}
    fi
    
    # Check logs
    echo ""
    echo_color "Logs Directory:" ${color_yellow}
    if [ -d "${log_dir}" ]; then
        echo_color "✓ Logs directory exists" ${color_green}
        if [ -f "${log_dir}/${app_name}-error.log" ]; then
            error_size=$(du -sh ${log_dir}/${app_name}-error.log 2>/dev/null | cut -f1)
            echo "  Error log: ${error_size}"
        fi
        if [ -f "${log_dir}/${app_name}-out.log" ]; then
            out_size=$(du -sh ${log_dir}/${app_name}-out.log 2>/dev/null | cut -f1)
            echo "  Output log: ${out_size}"
        fi
    else
        echo_color "✗ Logs directory not found" ${color_red}
    fi
    
    # Show access URLs
    echo ""
    echo_color "Access URLs:" ${color_yellow}
    echo "  http://localhost:${app_port}"
    local_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
    if [ ! -z "$local_ip" ]; then
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
        echo_color "Troubleshoot script not found" ${color_red}
        echo "Expected: scripts/troubleshoot.sh"
    fi
}

app_view_logs(){
    echo_color "Viewing all PM2 logs for ${app_name}..." ${color_yellow}
    pm2 logs ${app_name} --lines 100
}

app_test_health(){
    echo_color "Testing health endpoints..." ${color_yellow}
    echo ""
    
    # Test frontend health
    echo "Frontend health (http://localhost:${app_port}/health):"
    if curl -s http://localhost:${app_port}/health 2>/dev/null; then
        echo_color "✓ Frontend is responding" ${color_green}
    else
        echo_color "✗ Frontend is not responding" ${color_red}
    fi
    echo ""
    
    # Test frontend root
    echo "Frontend root (http://localhost:${app_port}):"
    http_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${app_port} 2>/dev/null)
    if [ "$http_code" = "200" ] || [ "$http_code" = "304" ]; then
        echo_color "✓ Frontend root is accessible (HTTP ${http_code})" ${color_green}
    else
        echo_color "✗ Frontend root returned HTTP ${http_code}" ${color_red}
    fi
    echo ""
    
    # Test backend API (if available)
    echo "Backend API (http://localhost:5030/health):"
    if curl -s http://localhost:5030/health 2>/dev/null; then
        echo_color "✓ Backend API is responding" ${color_green}
    else
        echo_color "✗ Backend API is not responding" ${color_red}
    fi
    echo ""
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
    *)
        echo_color "Invalid operation: ${operation}" ${color_red}
        exit 1
        ;;
esac

