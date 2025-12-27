#!/usr/bin/env bash

deploy_dir=/opt/monitoring/modbus_gateway
service_name=monitoring_modbus_gateway.service
service_file=monitoring_modbus_gateway.service

# deploy
sudo mkdir -p ${deploy_dir}
sudo dotnet publish --output "${deploy_dir}" --configuration Release
sudo cp run.sh ${deploy_dir}/run.sh

# systemd
sudo systemctl stop ${service_name}
sudo systemctl disable ${service_name}
sudo rm /etc/systemd/system/${service_file}
sudo cp ${service_file} /etc/systemd/system/${service_file}
sudo systemctl enable ${service_name}
