#!/bin/bash

dotnet-ef migrations add db0001
dotnet-ef database update
