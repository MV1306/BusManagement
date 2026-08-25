# API Change Notice — Bus Type Based Fares
**Date:** 2025
**Affects:** Fare Management, Fare Calculation, Route Management screens

---

## Summary

Fares are no longer tied to a specific route. They are now defined per **bus type**. Every route has a bus type assigned to it, and fare lookups use that bus type automatically.

This means:
- You set one fare table per bus type (Ordinary, Express, Deluxe, AC)
- The same stop pair (e.g. Central → Tambaram) has 4 possible fares — one per bus type
- When calculating a fare for a route, the API resolves the bus type from the route automatically

---

## BusType Enum

All bus type fields accept and return one of these exact string values:

| Value | Description |
|---|---|
| `Ordinary` | Standard city/mofussil bus |
| `Express` | Limited stop express service |
| `Deluxe` | Premium non-AC service |
| `AC` | Air conditioned service |

---

## Breaking Changes

### 1. Routes — POST /api/routes and PUT /api/routes/{id}

`busType` is now a **required field** in both create and update requests.

**Before**
```json
{
  "routeCode": "21G",
  "routeName": "Central - Tambaram",
  "createdBy": "admin"
}
```

**After**
```json
{
  "routeCode": "21G",
  "routeName": "Central - Tambaram",
  "busType": "Ordinary",
  "createdBy": "admin"
}
```

PUT request also requires `busType`:
```json
{
  "routeCode": "21G",
  "routeName": "Central - Tambaram",
  "busType": "Ordinary",
  "isActive": true,
  "modifiedBy": "admin"
}
```

---

### 2. Routes — GET /api/routes and GET /api/routes/{id}

Response now includes `busType`.

**Before**
```json
{
  "routeId": 1,
  "routeCode": "21G",
  "routeName": "Central - Tambaram",
  "isActive": true,
  "startingStop": "Chennai Central",
  "endingStop": "Tambaram"
}
```

**After**
```json
{
  "routeId": 1,
  "routeCode": "21G",
  "routeName": "Central - Tambaram",
  "busType": "Ordinary",
  "isActive": true,
  "startingStop": "Chennai Central",
  "endingStop": "Tambaram"
}
```

---

### 3. Fares — GET /api/fares (response shape changed)

`routeId` and `routeCode` fields are removed. Replaced by `busType`.

**Before**
```json
{
  "fareId": 1,
  "routeId": 1,
  "routeCode": "21G",
  "fromStopId": 1,
  "fromStopName": "Chennai Central",
  "toStopId": 18,
  "toStopName": "Tambaram",
  "fareAmount": 25.00,
  "isActive": true
}
```

**After**
```json
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
```

---

### 4. Fares — POST /api/fares (request body changed)

`routeId` is removed. `busType` is now required.

**Before**
```json
{
  "routeId": 1,
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
  "fromStopId": 1,
  "toStopId": 18,
  "fareAmount": 25.00,
  "effectiveFrom": "2024-01-01T00:00:00Z",
  "effectiveTo": null
}
```

> The combination of `busType + fromStopId + toStopId` must be unique. Attempting to create a duplicate will return `500`. Handle this on the UI by checking before saving or catching the error.

---

### 5. Fares — GET /api/fares/route/{routeId} is REMOVED

This endpoint no longer exists.

**Replacement:** `GET /api/fares/bus-type/{busType}`

Returns all fare records for a given bus type.

**Examples:**
```
GET /api/fares/bus-type/Ordinary
GET /api/fares/bus-type/Express
GET /api/fares/bus-type/Deluxe
GET /api/fares/bus-type/AC
```

**Response `200`**
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

---

### 6. Fare Calculation — GET /api/fares/calculate (response shape changed)

`busType` is now included in the response. No change to the request parameters.

**Request (unchanged)**
```
GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=18
```

**Before**
```json
{
  "routeCode": "21G",
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
  "numberOfStages": 17,
  "distanceKm": 28.4,
  "fare": 25.00
}
```

---

### 7. Fare Calculation — GET /api/fares/calculate-smart (response shape changed)

Each segment in the response now includes `busType`. No change to the request parameters.

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
    {
      "routeCode": "21G",
      "fromStop": "Chennai Central",
      "toStop": "Tambaram",
      "fare": 25.00
    }
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
    {
      "routeCode": "21G",
      "busType": "Ordinary",
      "fromStop": "Chennai Central",
      "toStop": "Tambaram",
      "fare": 25.00
    },
    {
      "routeCode": "108",
      "busType": "Express",
      "fromStop": "Tambaram",
      "toStop": "Chengalpattu",
      "fare": 10.00
    }
  ],
  "totalFare": 35.00
}
```

---

## Unchanged Endpoints

These endpoints have no changes and work exactly as before:

| Endpoint | Status |
|---|---|
| GET /api/stops | No change |
| GET /api/stops/{id} | No change |
| POST /api/stops | No change |
| PUT /api/stops/{id} | No change |
| DELETE /api/stops/{id} | No change |
| GET /api/routes | Response has new `busType` field |
| GET /api/routes/{id} | Response has new `busType` field |
| DELETE /api/routes/{id} | No change |
| GET /api/routes/{routeId}/stops | No change |
| POST /api/routes/{routeId}/stops | No change |
| PUT /api/routes/{routeId}/stops/reorder | No change |
| DELETE /api/routes/{routeId}/stops/{stopId} | No change |
| GET /api/routes/search | No change |
| GET /api/routes/smart-search | No change |
| GET /api/fares/{id} | Response shape changed (see §3) |
| PUT /api/fares/{id} | No change |
| DELETE /api/fares/{id} | No change |

---

## Updated UI Call Patterns

### Fare Management screen

Previously you loaded fares by route. Now load by bus type.

```
GET /api/fares/bus-type/Ordinary
GET /api/fares/bus-type/Express
GET /api/fares/bus-type/Deluxe
GET /api/fares/bus-type/AC
```

Suggested UI: a tab or dropdown to switch between bus types, showing the fare table for the selected type.

### Fare matrix screen

Previously built from `GET /api/fares/route/{routeId}`. Now use:

```
GET /api/fares/bus-type/{busType}
```

Build the matrix client-side from the returned fare pairs. Each bus type has its own matrix.

### Create/Edit Route screen

Add a bus type selector (dropdown) with the 4 options: `Ordinary`, `Express`, `Deluxe`, `AC`. This field is required.

### Create Fare screen

Replace the route dropdown with a bus type dropdown. The fare now applies to all routes of that bus type automatically.

### Fare Calculator screen

No UI change needed. The `routeId` parameter is still used — the API resolves the bus type internally from the route.
