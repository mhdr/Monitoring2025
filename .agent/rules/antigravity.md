---
trigger: always_on
---

# Monitoring2025 - Copilot Instructions

## 📁 Project Structure

This is a full-stack monitoring application with separate backend and frontend:

### Core (Industrial Monitoring & Control)
- **Location**: `Core`
- **Technology**: .NET Worker Services
- **Purpose**: Handles all monitoring and control operations for industrial controllers and PLCs
- **Components**:
  - `Core/` - Core library with data models, alarm processing, monitoring logic
  - `CoreService/` - Main worker service for monitoring operations
  - `JobsService/` - Background job processing service
  - `DataGen/` - Data generation service
  - `Contracts/` - Shared message contracts for inter-service communication
  - **Protocol Interfaces**:
    - `ModbusInterface/` - Modbus protocol communication
    - `BACnetInterface/` - BACnet protocol communication
    - `Sharp7Interface/` - Sharp7 PLC communication
    - `RabbitInterface/` - RabbitMQ messaging interface

### Backend (ASP.NET Web API)
- **Location**: `EMS`
- **Technology**: ASP.NET Core 10 Web API
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

---

## 🚀 Running Applications

⚠️ **MANDATORY: Always use `run.sh` scripts to start EMS/API or ui applications**

### Running the Backend (EMS/API)
```bash
cd EMS/API
./run.sh
```

### Running the Frontend (ui)
```bash
cd ui
./run.sh
```

**Why use run.sh?**
- Automatically handles port conflicts
- Ensures proper environment setup
- Manages process lifecycle correctly

**NEVER** run the applications directly using `dotnet run`, `npm run dev`, or similar commands. Always use the provided `run.sh` scripts.

---

## 🏷️ Element Identification

⚠️ **MANDATORY: ALL elements created by AI must have `data-id-ref` attribute**

### Scope
Every HTML element that you create (divs, buttons, inputs, forms, cards, modals, etc.) must include a `data-id-ref` attribute for automated testing, debugging, and element identification.

### Format
```
data-id-ref="component-element-purpose"
```
- Use **kebab-case** naming convention
- Structure: `[component]-[element]-[purpose]`

### Examples
```tsx
// Buttons
<Button data-id-ref="login-form-submit-btn">Login</Button>
<IconButton data-id-ref="navbar-menu-toggle">...</IconButton>

// Inputs
<TextField data-id-ref="user-settings-email-input" />
<Select data-id-ref="alarm-filter-status-select">...</Select>

// Containers
<Card data-id-ref="dashboard-alarm-card">...</Card>
<Modal data-id-ref="user-delete-confirm-modal">...</Modal>

// Forms
<form data-id-ref="device-config-form">...</form>
```

### Naming Guidelines
| Component Type | Pattern | Example |
|---------------|---------|---------|
| Buttons | `{context}-{action}-btn` | `alarm-dismiss-btn` |
| Inputs | `{context}-{field}-input` | `login-password-input` |
| Forms | `{context}-form` | `device-config-form` |
| Modals | `{context}-modal` | `user-delete-modal` |
| Cards | `{context}-card` | `dashboard-stats-card` |
| Tables | `{context}-table` | `users-list-table` |
| Rows | `{context}-row` | `alarm-item-row` |
