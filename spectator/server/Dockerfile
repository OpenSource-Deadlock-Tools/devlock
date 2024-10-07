# Use the official .NET SDK image for building the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set the working directory inside the container
WORKDIR /src

# Copy the solution file
COPY DeadlockSpectatorServer.sln ./

# Copy the project file and restore dependencies
COPY DeadlockSpectatorServer/DeadlockSpectatorServer.csproj DeadlockSpectatorServer/
RUN dotnet restore

# Copy the rest of the code
COPY . .

# Build the app
RUN dotnet publish DeadlockSpectatorServer/DeadlockSpectatorServer.csproj -c Release -o /app

# Use the official .NET runtime image for running the application
FROM mcr.microsoft.com/dotnet/runtime:8.0 AS runtime
WORKDIR /app

# Copy the build output from the build stage
COPY --from=build /app .

# Set the entry point to run the app
ENTRYPOINT ["dotnet", "DeadlockSpectatorServer.dll"]
