# AgroTrust API Reference

Base URL: `http://localhost:5000`

All protected routes require the header:
```
Authorization: Bearer <token>
```

---

## Auth

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| POST | `/api/auth/register` | No | `{ name, email, password, role }` | `{ message, token, user: { id, name, email, role } }` |
| POST | `/api/auth/login` | No | `{ email, password }` | `{ token, user: { id, name, email, role } }` |

---

## Wallet

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| GET | `/api/wallet` | Yes | — | `{ userId, balance }` |
| POST | `/api/wallet/init` | Yes | — | `{ message, wallet: { userId, balance } }` |

---

## Projects

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| POST | `/api/projects` | Yes (farmer) | `{ title, description, cropType, targetFund, riskPolicy }` | `{ message, project }` |
| GET | `/api/projects` | No | — | `[ ...projects ]` |
| GET | `/api/projects/:id` | No | — | `{ project }` |

---

## Invest

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| POST | `/api/invest` | Yes (investor) | `{ projectId, amount, returnType, agreedPercentage, agreedProduceQty }` | `{ message, investment, escrow, wallet }` |

---

## Escrow

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| GET | `/api/escrow/:projectId` | Yes | — | `{ escrow: { projectId, totalLocked, breakdown, status } }` |

---

## Milestone

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| POST | `/api/milestone/complete` | Yes (farmer) | `{ projectId }` | `{ message, project, transactions }` |
| POST | `/api/milestone/fail` | Yes (farmer) | `{ projectId }` | `{ message, project, transactions }` |

---

## Sensors

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| POST | `/api/sensors/simulate` | Yes | `{ projectId, sensorId, soilMoisture, temperature, humidity }` | `{ message, reading }` |
| GET | `/api/sensors/latest/:projectId` | Yes | — | `{ reading }` |
| GET | `/api/sensors/history/:projectId` | Yes | — | `[ ...readings ]` |

---

## IoT Ingest (Device endpoint)

| Method | URL | Auth | Request Body | Response |
|--------|-----|------|--------------|----------|
| POST | `/iot/ingest` | API Key header (`x-iot-key`) | `{ projectId, sensorId, soilMoisture, temperature, humidity }` | `{ message, reading }` |

---

## Error Responses

All errors follow the shape:
```json
{ "error": "Error message here" }
```

Common status codes:
- `400` — Bad request / validation error
- `401` — Unauthorized (missing or invalid token)
- `403` — Forbidden (wrong role)
- `404` — Resource not found
- `500` — Internal server error
