#!/bin/bash

dotnet dotnet-ef migrations add db0071
dotnet dotnet-ef database update
