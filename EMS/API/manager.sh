#!/bin/bash

color_green='\033[0;32m'
color_red='\033[0;31m'
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
    echo 'Select operation'

    echo '1 - start'
    echo '2 - stop'
    echo '3 - restart'
    echo '4 - status'
	echo '5 - deploy'
    echo '6 - full log'
    echo '7 - current log'
    echo '8 - deploy and start'
    echo '9 - live log'

    read -p 'operation: ' operation
fi

########################################################### App ####################################################################

service_name=ems3_api.service

# app: 1 operation: 1
app_start(){
    sudo systemctl start ${service_name}
}

# app: 1 operation: 2
app_stop(){
    sudo systemctl stop ${service_name}
}

# app: 1 operation: 3
app_restart(){
    sudo systemctl restart ${service_name}
}

# app: 1 operation: 4
app_status(){
    sudo systemctl status ${service_name}
}

# app: 1 operation: 5
app_deploy(){
	dos2unix install.sh
	chmod +x install.sh
    ./install.sh
}

# app: 1 operation: 6
app_full_log(){
    journalctl -u ${service_name}
}

# app: 1 operation: 7
app_current_log(){
    journalctl -u ${service_name} -b
}

# app: 1 operation: 8
app_deploy_start(){
    app_stop
    app_deploy
    app_start
}

# app: 1 operation: 9
app_live_log(){
    journalctl -u ${service_name} -f
}

if [[ ${operation} -eq '1' ]]
then
    app_start
elif [[ ${operation} -eq '2' ]]
then
    app_stop
elif [[ ${operation} -eq '3' ]]
then
    app_restart
elif [[ ${operation} -eq '4' ]]
then
    app_status
elif [[ ${operation} -eq '5' ]]
then
    app_deploy
elif [[ ${operation} -eq '6' ]]
then
    app_full_log
elif [[ ${operation} -eq '7' ]]
then
    app_current_log
elif [[ ${operation} -eq '8' ]]
then
    app_deploy_start
elif [[ ${operation} -eq '9' ]]
then
    app_live_log
fi
