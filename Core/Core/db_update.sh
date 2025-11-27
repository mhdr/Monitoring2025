#!/bin/bash

dotnet-ef migrations add db0060
dotnet-ef database update
