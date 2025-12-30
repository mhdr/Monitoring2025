#!/bin/bash

dotnet-ef migrations add db0061
dotnet-ef database update
