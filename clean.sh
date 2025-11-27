#!/bin/bash

dotnet clean ~/git/MonitoringCore/Core/Core.sln
rm -r ~/git/MonitoringCore/Core/Core/bin
rm -r ~/git/MonitoringCore/Core/Core/obj
rm -r ~/git/MonitoringCore/Core/CoreService/bin
rm -r ~/git/MonitoringCore/Core/CoreService/obj
rm -r ~/git/MonitoringCore/Core/Sharp7Interface/bin
rm -r ~/git/MonitoringCore/Core/Sharp7Interface/obj
rm -r ~/git/MonitoringCore/Core/BACnetInterface/bin
rm -r ~/git/MonitoringCore/Core/BACnetInterface/obj
rm -r ~/git/MonitoringCore/Core/Contracts/bin
rm -r ~/git/MonitoringCore/Core/Contracts/obj
rm -r ~/git/MonitoringCore/Core/RabbitInterface/bin
rm -r ~/git/MonitoringCore/Core/RabbitInterface/obj
rm -r ~/git/MonitoringCore/Core/JobsService/bin
rm -r ~/git/MonitoringCore/Core/JobsService/obj