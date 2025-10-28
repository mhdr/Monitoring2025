#!/bin/bash

dotnet-ef migrations add db0004
dotnet-ef database update
