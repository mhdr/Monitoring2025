#!/bin/bash

pushd Core/Core
   dotnet restore
popd

pushd Core/CoreService
   dotnet restore
popd

pushd Core/RabbitInterface
   dotnet restore
popd

sharp7_value=$(yq eval '.interfaces.sharp7' /opt/monitoring/config.yaml)

if [[ "$sharp7_value" == "1" ]]; then

   pushd Core/Sharp7Interface
      dotnet restore
   popd

fi

bacnet_value=$(yq eval '.interfaces.bacnet' /opt/monitoring/config.yaml)

if [[ "$bacnet_value" == "1" ]]; then

   pushd Core/BACnetInterface
      dotnet restore
   popd
   
fi

modbus_value=$(yq eval '.interfaces.modbus' /opt/monitoring/config.yaml)

if [[ "$modbus_value" == "1" ]]; then

   pushd Core/ModbusInterface
      dotnet restore
   popd
   
fi

jobs_value=$(yq eval '.interfaces.jobs' /opt/monitoring/config.yaml)

if [[ "$jobs_value" == "1" ]]; then

   pushd Core/JobsService
      dotnet restore
   popd
   
fi
