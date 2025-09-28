#!/bin/bash

dotnet-ef migrations add db0002
dotnet-ef database update
