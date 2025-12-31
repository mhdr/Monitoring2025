#!/bin/bash

dotnet dotnet-ef migrations add db0067
dotnet dotnet-ef database update
