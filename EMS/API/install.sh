#!/usr/bin/env bash

deploy_dir=/opt/ems3/api
service_name=ems3_api.service
service_file=ems3_api.service

# deploy
sudo mkdir -p ${deploy_dir}
sudo dotnet publish --output "${deploy_dir}" --configuration Release

# Set restrictive permissions on configuration file (contains password)
if [ -f "${deploy_dir}/appsettings.Production.json" ]; then
    sudo chmod 600 "${deploy_dir}/appsettings.Production.json"
    echo "Set restrictive permissions on appsettings.Production.json"
fi

# systemd
sudo systemctl stop ${service_name}
sudo systemctl disable ${service_name}
sudo rm -f /etc/systemd/system/${service_file}
sudo cp ${service_file} /etc/systemd/system/${service_file}
sudo systemctl daemon-reload
sudo systemctl enable ${service_name}
