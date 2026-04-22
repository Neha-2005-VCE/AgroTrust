# Minimum Guaranteed Support (MGS) — API & DB Schema Documentation

## Database Schema

### Model: MinimumGuaranteedSupport
| Field               | Type      | Description                                 |
|---------------------|-----------|---------------------------------------------|
| _id                 | ObjectId  | Primary key                                 |
| investment_id       | ObjectId  | Reference to Investment                     |
| guarantee_percent   | Number    | 0.2–0.3 (20–30% of investment)              |
| guarantee_amount    | Number    | Calculated guarantee amount                 |
| disbursement_status | String    | 'pending', 'released', 'failed'             |
| failure_reason      | String    | Reason for disbursement (nullable)          |
| createdAt           | Date      | Timestamp                                   |
| updatedAt           | Date      | Timestamp                                   |

### Escrow Model Additions
| Field                   | Type     | Description                                |
|-------------------------|----------|--------------------------------------------|
| guaranteed_frozen_amount| Number   | Amount frozen for MGS                      |
| guarantee_released      | Boolean  | If guarantee has been released             |

### Investment Model Addition
| Field      | Type     | Description                |
|------------|----------|----------------------------|
| escrow_id  | ObjectId | Reference to Escrow record |

---

## API Endpoints

### 1. Create/Freeze MGS (auto on investment)
- **POST /api/invest**
- Body: `{ projectId, amount }`
- Result: MGS record created, guarantee frozen in escrow

### 2. Trigger MGS Disbursement (auto/manual)
- **POST /api/mgs/trigger**
- Body: `{ investment_id, actual_yield, failure_threshold, failure_reason? }`
- Result: If crop failure, guarantee released to farmer

### 3. Admin Trigger MGS
- **POST /api/mgs/admin-trigger**
- Body: `{ investment_id, failure_reason }`
- Result: Admin can manually release guarantee

### 4. Get MGS Status
- **GET /api/mgs/:investment_id**
- Result: Returns MGS record for investment

---

## Example MGS Record
```json
{
  "_id": "...",
  "investment_id": "...",
  "guarantee_percent": 0.2,
  "guarantee_amount": 1000,
  "disbursement_status": "pending",
  "failure_reason": null,
  "createdAt": "2026-04-07T...",
  "updatedAt": "2026-04-07T..."
}
```

---

## Notes
- Guarantee is frozen at investment creation.
- Disbursement is triggered by crop failure (API or admin).
- Guarantee amount and status are always queryable by investment.
