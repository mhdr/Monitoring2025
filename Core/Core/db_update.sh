#!/bin/bash

dotnet-ef migrations add db0064
dotnet-ef database update
