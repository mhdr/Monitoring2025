#!/bin/bash

dotnet-ef migrations add db0062
dotnet-ef database update
