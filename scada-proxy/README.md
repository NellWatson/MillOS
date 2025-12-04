# MillOS SCADA Proxy

Backend proxy service that bridges industrial protocols (OPC-UA, Modbus) to REST/WebSocket APIs for browser clients.

## Features

- **OPC-UA Client**: Connect to OPC-UA servers for PLC data
- **Modbus TCP Client**: Connect to Modbus devices
- **REST API**: HTTP endpoints for tag values
- **WebSocket**: Real-time push updates to clients
- **Tag Registry**: Configurable tag definitions via JSON

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Configure your SCADA endpoints in .env
# Start development server
npm run dev

# Or build and start production
npm run build
npm start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | HTTP/WebSocket server port |
| `POLL_INTERVAL` | 1000 | Polling interval in ms |
| `OPCUA_ENDPOINT` | - | OPC-UA server URL (e.g., `opc.tcp://localhost:4840`) |
| `MODBUS_HOST` | - | Modbus TCP host IP |
| `MODBUS_PORT` | 502 | Modbus TCP port |

### Tag Configuration

Create a `tags.json` file in the project root to define tags:

```json
[
  {
    "id": "RM101.ST001.PV",
    "name": "Roller Mill 101 Speed",
    "protocol": "opcua",
    "address": "ns=2;s=RM101.Speed",
    "dataType": "FLOAT32",
    "accessMode": "READ",
    "engineeringUnits": "RPM",
    "engLow": 0,
    "engHigh": 2000
  },
  {
    "id": "SILO_ALPHA.LT001.PV",
    "name": "Silo Alpha Level",
    "protocol": "modbus",
    "address": "40001",
    "dataType": "FLOAT32",
    "accessMode": "READ",
    "modbusRegister": "holding",
    "modbusOffset": 0,
    "modbusSlave": 1
  }
]
```

## API Reference

### REST Endpoints

#### Health Check
```
GET /health
```
Returns server status and connection states.

#### Get Single Tag
```
GET /tags/:tagId
```
Returns current value for a specific tag.

#### Get Multiple Tags
```
POST /tags/batch
Content-Type: application/json

{ "tagIds": ["RM101.ST001.PV", "SILO_ALPHA.LT001.PV"] }
```
Returns values for multiple tags in a single request.

#### Get All Tags
```
GET /tags
```
Returns all tag values.

#### Write to Tag
```
PUT /tags/:tagId
Content-Type: application/json

{ "value": 1500 }
```
Writes a value to a writable tag.

#### Connection Status
```
GET /status
```
Returns detailed connection status for all protocols.

### WebSocket

Connect to `ws://localhost:3001/ws` for real-time updates.

#### Messages from Server

**Snapshot** (sent on connect):
```json
{
  "type": "snapshot",
  "tags": [
    { "tagId": "RM101.ST001.PV", "value": 1450.5, "quality": "GOOD", "timestamp": 1234567890 }
  ]
}
```

**Update** (sent on value change):
```json
{
  "type": "update",
  "tagId": "RM101.ST001.PV",
  "value": 1455.2,
  "quality": "GOOD",
  "timestamp": 1234567891
}
```

#### Messages to Server

**Write**:
```json
{
  "type": "write",
  "tagId": "RM101.SP001.SP",
  "value": 1500
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (MillOS)                         │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │   REST Adapter  │  │         MQTT Adapter            │   │
│  │  (Polling)      │  │       (WebSocket)               │   │
│  └────────┬────────┘  └────────────────┬────────────────┘   │
└───────────┼────────────────────────────┼────────────────────┘
            │                            │
            ▼                            ▼
┌───────────────────────────────────────────────────────────┐
│                   SCADA Proxy Server                       │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │    REST API     │  │         WebSocket              │  │
│  │  /tags, /health │  │      ws://.../ ws              │  │
│  └────────┬────────┘  └────────────────┬───────────────┘  │
│           └─────────────┬──────────────┘                   │
│                         ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Tag Registry                        │   │
│  │          (Current values, definitions)               │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                    │
│     ┌─────────────────┼─────────────────┐                  │
│     ▼                 ▼                 ▼                  │
│  ┌──────────┐   ┌──────────┐    ┌──────────────┐           │
│  │ OPC-UA   │   │ Modbus   │    │   (Future)   │           │
│  │ Adapter  │   │ Adapter  │    │ BACnet, etc  │           │
│  └────┬─────┘   └────┬─────┘    └──────────────┘           │
└───────┼──────────────┼─────────────────────────────────────┘
        │              │
        ▼              ▼
   ┌─────────┐    ┌─────────┐
   │ OPC-UA  │    │ Modbus  │
   │ Server  │    │ Device  │
   │ (PLC)   │    │ (RTU)   │
   └─────────┘    └─────────┘
```

## License

MIT
