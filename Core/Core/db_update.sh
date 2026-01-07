#!/bin/bash

dotnet dotnet-ef migrations add db0070
dotnet dotnet-ef database update
