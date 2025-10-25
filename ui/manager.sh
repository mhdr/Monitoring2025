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
    echo 'EMS3 UI Management Script'
    echo '========================================'
    echo 'Select operation:'
    echo ''
    echo '1  - Deploy (build and copy files)'
    echo '2  - Reload nginx'
    echo '3  - Restart nginx'
    echo '4  - Nginx status'
    echo '5  - Test nginx config'
    echo '6  - View error log (last 50 lines)'
    echo '7  - View access log (last 50 lines)'
    echo '8  - Follow error log (live)'
    echo '9  - Follow access log (live)'
    echo '10 - Clean build cache'
    echo '11 - Full deploy (install + configure)'
    echo '12 - List deployed files'
    echo '13 - Enable nginx site'
    echo '14 - Disable nginx site'
    echo '15 - Check deployment status'
    echo ''

    read -p 'Enter operation number: ' operation
fi

########################################################### App ####################################################################

deploy_dir=/var/www/ems3/ui
nginx_site_name=ems3_ui

# operation: 1
app_deploy(){
    echo_color "Building and deploying..." ${color_yellow}
    dos2unix install.sh 2>/dev/null || true
    chmod +x install.sh
    ./install.sh
}

# operation: 2
app_reload_nginx(){
    echo_color "Reloading nginx..." ${color_yellow}
    sudo systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo_color "✓ Nginx reloaded successfully" ${color_green}
    else
        echo_color "✗ Failed to reload nginx" ${color_red}
    fi
}

# operation: 3
app_restart_nginx(){
    echo_color "Restarting nginx..." ${color_yellow}
    sudo systemctl restart nginx
    if [ $? -eq 0 ]; then
        echo_color "✓ Nginx restarted successfully" ${color_green}
    else
        echo_color "✗ Failed to restart nginx" ${color_red}
    fi
}

# operation: 4
app_nginx_status(){
    sudo systemctl status nginx
}

# operation: 5
app_nginx_test(){
    echo_color "Testing nginx configuration..." ${color_yellow}
    sudo nginx -t
}

# operation: 6
app_nginx_error_log(){
    echo_color "Last 50 lines of error log:" ${color_yellow}
    sudo tail -n 50 /var/log/nginx/ems3_ui_error.log
}

# operation: 7
app_nginx_access_log(){
    echo_color "Last 50 lines of access log:" ${color_yellow}
    sudo tail -n 50 /var/log/nginx/ems3_ui_access.log
}

# operation: 8
app_nginx_error_log_live(){
    echo_color "Following error log (Ctrl+C to stop)..." ${color_yellow}
    sudo tail -f /var/log/nginx/ems3_ui_error.log
}

# operation: 9
app_nginx_access_log_live(){
    echo_color "Following access log (Ctrl+C to stop)..." ${color_yellow}
    sudo tail -f /var/log/nginx/ems3_ui_access.log
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
    echo_color "Deployed files in ${deploy_dir}:" ${color_yellow}
    if [ -d "${deploy_dir}" ]; then
        ls -lah ${deploy_dir}
    else
        echo_color "✗ Deploy directory does not exist" ${color_red}
    fi
}

# operation: 13
app_enable_site(){
    echo_color "Enabling nginx site..." ${color_yellow}
    sudo ln -sf /etc/nginx/sites-available/${nginx_site_name} /etc/nginx/sites-enabled/${nginx_site_name}
    sudo nginx -t && sudo systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo_color "✓ Site enabled successfully" ${color_green}
    else
        echo_color "✗ Failed to enable site" ${color_red}
    fi
}

# operation: 14
app_disable_site(){
    echo_color "Disabling nginx site..." ${color_yellow}
    sudo rm -f /etc/nginx/sites-enabled/${nginx_site_name}
    sudo systemctl reload nginx
    if [ $? -eq 0 ]; then
        echo_color "✓ Site disabled successfully" ${color_green}
    else
        echo_color "✗ Failed to disable site" ${color_red}
    fi
}

# operation: 15
app_check_status(){
    echo_color "=== Deployment Status ===" ${color_yellow}
    echo ""
    
    # Check nginx
    echo_color "Nginx Status:" ${color_yellow}
    if systemctl is-active --quiet nginx; then
        echo_color "✓ Nginx is running" ${color_green}
    else
        echo_color "✗ Nginx is not running" ${color_red}
    fi
    
    # Check site enabled
    echo ""
    echo_color "Site Configuration:" ${color_yellow}
    if [ -L "/etc/nginx/sites-enabled/${nginx_site_name}" ]; then
        echo_color "✓ Site is enabled" ${color_green}
    else
        echo_color "✗ Site is not enabled" ${color_red}
    fi
    
    # Check deploy directory
    echo ""
    echo_color "Deployment Directory:" ${color_yellow}
    if [ -d "${deploy_dir}" ] && [ -f "${deploy_dir}/index.html" ]; then
        echo_color "✓ Files deployed at ${deploy_dir}" ${color_green}
        file_count=$(find ${deploy_dir} -type f | wc -l)
        dir_size=$(du -sh ${deploy_dir} 2>/dev/null | cut -f1)
        echo "  Files: ${file_count}"
        echo "  Size: ${dir_size}"
    else
        echo_color "✗ No deployment found" ${color_red}
    fi
    
    # Check config
    echo ""
    echo_color "Configuration Test:" ${color_yellow}
    if sudo nginx -t &>/dev/null; then
        echo_color "✓ Nginx configuration is valid" ${color_green}
    else
        echo_color "✗ Nginx configuration has errors" ${color_red}
    fi
    
    # Show access URLs
    echo ""
    echo_color "Access URLs:" ${color_yellow}
    echo "  http://localhost"
    local_ip=$(hostname -I | awk '{print $1}')
    if [ ! -z "$local_ip" ]; then
        echo "  http://${local_ip}"
    fi
}

# Execute operation
case ${operation} in
    1)
        app_deploy
        ;;
    2)
        app_reload_nginx
        ;;
    3)
        app_restart_nginx
        ;;
    4)
        app_nginx_status
        ;;
    5)
        app_nginx_test
        ;;
    6)
        app_nginx_error_log
        ;;
    7)
        app_nginx_access_log
        ;;
    8)
        app_nginx_error_log_live
        ;;
    9)
        app_nginx_access_log_live
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
        app_enable_site
        ;;
    14)
        app_disable_site
        ;;
    15)
        app_check_status
        ;;
    *)
        echo_color "Invalid operation: ${operation}" ${color_red}
        exit 1
        ;;
esac

