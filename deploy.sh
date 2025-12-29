#!/bin/bash

# git reset --hard main
# gh repo sync --force

find . -type f -name "*.sh" -exec dos2unix "{}" \;
find . -type f -name "*.sh" -exec chmod +x "{}" \;

pushd Core/CoreService || exit
   systemctl stop monitoring_core.service
   systemctl disable monitoring_core.service
   rm -r /opt/monitoring/core/*
   rm /etc/systemd/system/monitoring_core.service
   cp monitoring_core.service /etc/systemd/system/monitoring_core.service
   mkdir -p /opt/monitoring/core
   dotnet publish --output /opt/monitoring/core --configuration Release
   sudo systemctl enable monitoring_core.service
   systemctl start monitoring_core.service
popd || exit

pushd Core/RabbitInterface || exit
   systemctl stop monitoring_interface_rabbit.service
   systemctl disable monitoring_interface_rabbit.service
   rm -r /opt/monitoring/rabbit/*
   rm /etc/systemd/system/monitoring_interface_rabbit.service
   cp monitoring_interface_rabbit.service /etc/systemd/system/monitoring_interface_rabbit.service
   mkdir -p /opt/monitoring/rabbit
   dotnet publish --output /opt/monitoring/rabbit --configuration Release
   sudo systemctl enable monitoring_interface_rabbit.service
   systemctl start monitoring_interface_rabbit.service
popd || exit

sharp7_value=$(yq eval '.interfaces.sharp7' /opt/monitoring/config.yaml)

if [[ "$sharp7_value" == "1" ]]; then
   systemctl stop monitoring_interface_sharp7.service
   rm -r /opt/monitoring/sharp7/*

   pushd Core/Sharp7Interface || exit
      ./manager.sh 8
   popd || exit

else
   sharp7_status=$(systemctl is-active monitoring_interface_sharp7.service)
   if [[ "$sharp7_status" == "active" ]]; then
      systemctl stop monitoring_interface_sharp7.service
      systemctl disable monitoring_interface_sharp7.service
      rm -r /opt/monitoring/sharp7/*
   fi
fi

bacnet_value=$(yq eval '.interfaces.bacnet' /opt/monitoring/config.yaml)

# Check if bacnet is 1
if [[ "$bacnet_value" == "1" ]]; then
   systemctl stop monitoring_interface_bacnet.service
   rm -r /opt/monitoring/bacnet/*

   pushd Core/BACnetInterface || exit
      ./manager.sh 8
   popd || exit

else
   bacnet_status=$(systemctl is-active monitoring_interface_bacnet.service)
   if [[ "$bacnet_status" == "active" ]]; then
      systemctl stop monitoring_interface_bacnet.service
      systemctl disable monitoring_interface_bacnet.service
      rm -r /opt/monitoring/bacnet/*
   fi
fi


modbus_value=$(yq eval '.interfaces.modbus' /opt/monitoring/config.yaml)

# Check if modbus is 1
if [[ "$modbus_value" == "1" ]]; then
   systemctl stop monitoring_interface_modbus.service
   rm -r /opt/monitoring/modbus/*

   pushd Core/ModbusInterface || exit
      ./manager.sh 8
   popd || exit

else
   modbus_status=$(systemctl is-active monitoring_interface_modbus.service)
   if [[ "$modbus_status" == "active" ]]; then
      systemctl stop monitoring_interface_modbus.service
      systemctl disable monitoring_interface_modbus.service
      rm -r /opt/monitoring/modbus/*
   fi
fi

modbus_gateway_value=$(yq eval '.interfaces.modbus_gateway' /opt/monitoring/config.yaml)

# Check if modbus_gateway is 1
if [[ "$modbus_gateway_value" == "1" ]]; then
   systemctl stop monitoring_modbus_gateway.service
   rm -r /opt/monitoring/modbus_gateway/*

   pushd Core/ModbusGateway || exit
      ./manager.sh 8
   popd || exit

else
   modbus_gateway_status=$(systemctl is-active monitoring_modbus_gateway.service)
   if [[ "$modbus_gateway_status" == "active" ]]; then
      systemctl stop monitoring_modbus_gateway.service
      systemctl disable monitoring_modbus_gateway.service
      rm -r /opt/monitoring/modbus_gateway/*
   fi
fi

systemctl daemon-reload