#!/bin/bash

dotnet-ef migrations add db0003
dotnet-ef database update
