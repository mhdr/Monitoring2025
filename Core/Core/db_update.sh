#!/bin/bash

dotnet dotnet-ef migrations add db0068
dotnet dotnet-ef database update
