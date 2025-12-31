#!/bin/bash

dotnet-ef migrations add db0066
dotnet-ef database update
