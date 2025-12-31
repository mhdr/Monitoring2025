#!/bin/bash

dotnet-ef migrations add db0065
dotnet-ef database update
