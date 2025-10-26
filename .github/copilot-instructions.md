# Monitoring2025 - Copilot Instructions

## 📁 Project Structure

This is a full-stack monitoring application with separate backend and frontend:

### Backend (ASP.NET Web API)
- **Location**: `EMS/API`
- **Technology**: ASP.NET Core 9.0 Web API
- **Database**: PostgreSQL with Entity Framework Core
- **Authentication**: JWT with refresh token rotation
- **Real-time**: SignalR for live updates
- **Messaging**: MassTransit with RabbitMQ
- **Port**: HTTP on localhost:5030

### Frontend (React)
- **Location**: `ui`
- **Technology**: React 18 + TypeScript 5 + Vite
- **UI Framework**: Material-UI v6
- **State Management**: Context API + SignalR
- **i18n**: Bilingual support (Persian/English) with RTL/LTR
- **Port**: Development server on localhost:5173

## 📝 Important Notes

- **Backend details**: See `EMS/API/.github/copilot-instructions.md`
- **Frontend details**: See `ui/.github/copilot-instructions.md`
- **Git commits**: NEVER commit to git automatically - manual control only
- **Testing**: Use Chrome DevTools MCP for all testing and debugging

## 🚀 Quick Start

### Backend
```bash
cd EMS/API
dotnet run
```

### Frontend
```bash
cd ui
npm run dev
```
