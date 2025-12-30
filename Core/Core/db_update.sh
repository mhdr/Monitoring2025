#!/bin/bash

dotnet-ef migrations add db0063
dotnet-ef database update
