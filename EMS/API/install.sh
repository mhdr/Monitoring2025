#!/usr/bin/env bash

deploy_dir=/opt/ems3/api
service_name=ems3_api.service
service_file=ems3_api.service

# deploy
sudo mkdir -p ${deploy_dir}
sudo dotnet publish --output "${deploy_dir}" --configuration Release
sudo cp create-certificates.sh ${deploy_dir}/create-certificates.sh

# systemd
sudo systemctl stop ${service_name}
sudo systemctl disable ${service_name}
sudo rm /etc/systemd/system/${service_file}
sudo cp ${service_file} /etc/systemd/system/${service_file}
sudo systemctl enable ${service_name}
