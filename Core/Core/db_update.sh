#!/bin/bash

dotnet dotnet-ef migrations add db0073_FormMemoryGlobalVarOutput
dotnet dotnet-ef database update
