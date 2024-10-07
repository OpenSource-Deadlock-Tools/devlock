# Use the official .NET SDK 8.0 image for building the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# Set the working directory inside the container
WORKDIR /src

# Copy the solution file
COPY DeadlockSpectator.sln ./

# Copy the project files for both projects
COPY DeadlockAPI/DeadlockAPI.csproj DeadlockAPI/
COPY DeadlockSpectator/DeadlockSpectator.csproj DeadlockSpectator/

# Restore dependencies for both projects
RUN dotnet restore

# Copy the rest of the code
COPY . .

# Build the app
RUN dotnet publish DeadlockSpectator/DeadlockSpectator.csproj -c Release -o /app

# Use the official .NET runtime 8.0 image for running the app
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime

# Set the working directory inside the container
WORKDIR /app

# Copy the build output from the build stage
COPY --from=build /app .

# Set the entry point to run the app
ENTRYPOINT ["dotnet", "DeadlockSpectator.dll"]
