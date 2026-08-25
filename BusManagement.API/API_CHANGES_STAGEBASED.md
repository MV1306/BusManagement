# API Change Notice — Stage Based Fares
**Date:** 2025
**Affects:** Fare Management screen, Fare Calculator screen

---

## Summary

Fares are no longer defined per stop pair (From Stop → To Stop).
They are now defined per **bus type + number of stages (stops) travelled**.

This simplifies fare management significantly:
- Instead of maintaining hundreds of stop-pair combinations, you maintain one fare table per bus type
- The system automatically counts how many stops the passenger travels and looks up the fare

**Example fare table for Ordinary:**

| Stages | Fare |
|---|---|
| 1 | ₹5 |
| 2 | ₹6 |
| 3 | ₹8 |
| 4 | ₹10 |
| 5 | ₹13 |

---

## What is a Stage?

A stage is the number of stop-to-stop hops between the boarding stop and the alighting stop.

Example: If a passenger boards at Stop 1 and alights at Stop 4, they have travelled **3 stages**.

---

## Breaking Changes

### 1. GET /api/fares — response shape changed

`fromStopId`, `fromStopName`, `toStopId`, `toStopName` are removed.
`stages` is added.

**Before**
```json
[
  {
    "fareId": 1,
    "busType": "Ordinary",
    "fromStopId": 1,
    "fromStopName": "Chennai Central",
    "toStopId": 18,
    "toStopName": "Tambaram",
    "fareAmount": 25.00,
    "isActive": true
  }
]
```

**After**
```json
[
  {
    "fareId": 1,
    "busType": "Ordinary",
    "stages": 3,
    "fareAmount": 8.00,
    "isActive": true
  }
]
```

---

### 2. GET /api/fares/{id} — response shape changed

Same as above.

**After**
```json
{
  "fareId": 1,
  "busType": "Ordinary",
  "stages": 3,
  "fareAmount": 8.00,
  "isActive": true
}
```

---

### 3. GET /api/fares/bus-type/{busType} — response shape changed

Returns all stage-fare entries for a bus type, ordered by stages ascending.
Useful for rendering the fare table on the Fare Management screen.

**Example:** `GET /api/fares/bus-type/Ordinary`

**After**
```json
[
  { "fareId": 1, "busType": "Ordinary", "stages": 1, "fareAmount": 5.00,  "isActive": true },
  { "fareId": 2, "busType": "Ordinary", "stages": 2, "fareAmount": 6.00,  "isActive": true },
  { "fareId": 3, "busType": "Ordinary", "stages": 3, "fareAmount": 8.00,  "isActive": true },
  { "fareId": 4, "busType": "Ordinary", "stages": 4, "fareAmount": 10.00, "isActive": true },
  { "fareId": 5, "busType": "Ordinary", "stages": 5, "fareAmount": 13.00, "isActive": true }
]
```

---

### 4. POST /api/fares — request body completely changed

`fromStopId`, `toStopId`, `effectiveFrom`, `effectiveTo` are all removed.
`stages` is now required.

**Before**
```json
{
  "busType": "Ordinary",
  "fromStopId": 1,
  "toStopId": 18,
  "fareAmount": 25.00,
  "effectiveFrom": "2024-01-01T00:00:00Z",
  "effectiveTo": null
}
```

**After**
```json
{
  "busType": "Ordinary",
  "stages": 3,
  "fareAmount": 8.00
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| busType | string | Yes | `Ordinary`, `Express`, `Deluxe`, `AC` |
| stages | int | Yes | Must be >= 1. Combination of busType + stages must be unique |
| fareAmount | decimal | Yes | e.g. `8.00` |

> If you try to create a duplicate `busType + stages` combination the API will return `500`. Prevent this on the UI by checking if the entry already exists before saving, or show a friendly error message.

---

### 5. PUT /api/fares/{id} — request body simplified

Only `fareAmount` and `isActive` can be updated. Stages and bus type cannot be changed after creation.

**Before**
```json
{
  "fareAmount": 30.00,
  "effectiveFrom": "2024-06-01T00:00:00Z",
  "effectiveTo": null,
  "isActive": true
}
```

**After**
```json
{
  "fareAmount": 9.00,
  "isActive": true
}
```

---

### 6. GET /api/fares/calculate — response shape changed

`busType` and `stages` are now in the response. No change to query parameters.

**Request (unchanged)**
```
GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=4
```

**Before**
```json
{
  "routeCode": "21G",
  "busType": "Ordinary",
  "fromStop": "Chennai Central",
  "toStop": "Tambaram",
  "numberOfStages": 17,
  "distanceKm": 28.4,
  "fare": 25.00
}
```

**After**
```json
{
  "routeCode": "21G",
  "busType": "Ordinary",
  "fromStop": "Chennai Central",
  "toStop": "Tambaram",
  "stages": 3,
  "distanceKm": 5.4,
  "fare": 8.00
}
```

> `fare` will be `0` if no fare record exists for that bus type and stage count. This means the fare table is incomplete — prompt the admin to add the missing stage fare.

---

### 7. GET /api/fares/calculate-smart — response shape changed

Each segment now includes `stages`. No change to query parameters.

**Request (unchanged)**
```
GET /api/fares/calculate-smart?fromStopId=1&toStopId=40
```

**Before**
```json
{
  "from": "Chennai Central",
  "to": "Chengalpattu",
  "segments": [
    { "routeCode": "21G",  "busType": "Ordinary", "fromStop": "Chennai Central", "toStop": "Tambaram",    "fare": 25.00 },
    { "routeCode": "108",  "busType": "Express",  "fromStop": "Tambaram",        "toStop": "Chengalpattu","fare": 10.00 }
  ],
  "totalFare": 35.00
}
```

**After**
```json
{
  "from": "Chennai Central",
  "to": "Chengalpattu",
  "segments": [
    { "routeCode": "21G", "busType": "Ordinary", "fromStop": "Chennai Central", "toStop": "Tambaram",     "stages": 17, "fare": 25.00 },
    { "routeCode": "108", "busType": "Express",  "fromStop": "Tambaram",        "toStop": "Chengalpattu", "stages": 6,  "fare": 12.00 }
  ],
  "totalFare": 37.00
}
```

---

## Unchanged Endpoints

| Endpoint | Status |
|---|---|
| GET /api/stops | No change |
| GET /api/stops/{id} | No change |
| POST /api/stops | No change |
| PUT /api/stops/{id} | No change |
| DELETE /api/stops/{id} | No change |
| GET /api/routes | No change |
| GET /api/routes/{id} | No change |
| POST /api/routes | No change |
| PUT /api/routes/{id} | No change |
| DELETE /api/routes/{id} | No change |
| GET /api/routes/{routeId}/stops | No change |
| POST /api/routes/{routeId}/stops | No change |
| PUT /api/routes/{routeId}/stops/reorder | No change |
| DELETE /api/routes/{routeId}/stops/{stopId} | No change |
| GET /api/routes/search | No change |
| GET /api/routes/smart-search | No change |
| DELETE /api/fares/{id} | No change |

---

## Updated UI Call Patterns

### Fare Management screen

Load the fare table for a bus type:
```
GET /api/fares/bus-type/Ordinary
GET /api/fares/bus-type/Express
GET /api/fares/bus-type/Deluxe
GET /api/fares/bus-type/AC
```

Suggested UI layout — a tab per bus type, each showing a simple two-column table:

| Stages | Fare | Actions |
|---|---|---|
| 1 | ₹5.00 | Edit |
| 2 | ₹6.00 | Edit |
| 3 | ₹8.00 | Edit |

Add new row → `POST /api/fares` with `busType`, `stages`, `fareAmount`
Edit fare amount → `PUT /api/fares/{id}` with `fareAmount` and `isActive`

### Fare Calculator screen

No change to how you call the API. The response now returns `stages` instead of `numberOfStages` — update the field name when reading the response.

```
GET /api/fares/calculate?routeId=X&fromStopId=Y&toStopId=Z
```

Display: Route, Bus Type, From, To, Stages travelled, Distance, Fare.

### Smart Fare Calculator screen

No change to how you call the API. Each segment now has a `stages` field.

```
GET /api/fares/calculate-smart?fromStopId=X&toStopId=Y
```
