#!/bin/bash

dotnet dotnet-ef migrations add db0075_DeadbandMemoryGlobalVariable
dotnet dotnet-ef database update

