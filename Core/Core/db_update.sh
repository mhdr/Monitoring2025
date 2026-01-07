#!/bin/bash

dotnet dotnet-ef migrations add db0074_IfMemoryGlobalVarOutput
dotnet dotnet-ef database update
