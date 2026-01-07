#!/bin/bash

dotnet dotnet-ef migrations add db0072
dotnet dotnet-ef database update
