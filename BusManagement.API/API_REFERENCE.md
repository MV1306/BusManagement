# Bus Management System — API Reference
**Base URL:** `http://localhost:5131/api`
**Format:** All requests and responses are JSON.
**Interactive Docs:** `http://localhost:5131/swagger`

---

## General Conventions

| Convention | Detail |
|---|---|
| Success – data returned | `200 OK` |
| Success – resource created | `201 Created` + `Location` header |
| Success – no content | `204 No Content` |
| Not found | `404 Not Found` |
| Validation error | `400 Bad Request` |

All timestamps are UTC ISO 8601 strings (e.g. `"2024-01-15T10:30:00Z"`).
Optional fields are marked with `?`.

---

## 1. Stops

### GET /api/stops
Returns all stops.

**Response `200`**
```json
[
  {
    "stopId": 1,
    "stopCode": "CHN-CTL",
    "stopName": "Chennai Central",
    "shortName": "Central",
    "latitude": 13.0827,
    "longitude": 80.2707,
    "isActive": true
  }
]
```

---

### GET /api/stops/{id}
Returns a single stop.

**Path Params**
| Param | Type | Description |
|---|---|---|
| id | int | Stop ID |

**Response `200`**
```json
{
  "stopId": 1,
  "stopCode": "CHN-CTL",
  "stopName": "Chennai Central",
  "shortName": "Central",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "isActive": true
}
```
**Response `404`** — Stop not found.

---

### POST /api/stops
Creates a new stop.

**Request Body**
```json
{
  "stopCode": "CHN-CTL",
  "stopName": "Chennai Central",
  "shortName": "Central",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "createdBy": "admin"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| stopCode | string | Yes | Must be unique, max 20 chars |
| stopName | string | Yes | Max 100 chars |
| shortName | string? | No | Max 50 chars |
| latitude | number? | No | Decimal degrees |
| longitude | number? | No | Decimal degrees |
| createdBy | string? | No | Username |

**Response `201`** — Returns created stop object.

---

### PUT /api/stops/{id}
Updates an existing stop.

**Request Body**
```json
{
  "stopCode": "CHN-CTL",
  "stopName": "Chennai Central",
  "shortName": "Central",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "isActive": true,
  "modifiedBy": "admin"
}
```

**Response `200`** — Returns updated stop object.
**Response `404`** — Stop not found.

---

### DELETE /api/stops/{id}
Deletes a stop.

**Response `204`** — Deleted.
**Response `404`** — Stop not found.

---

## 2. Routes

### GET /api/routes
Returns all routes with their first and last stop names.

**Response `200`**
```json
[
  {
    "routeId": 1,
    "routeCode": "21G",
    "routeName": "Central - Tambaram",
    "isActive": true,
    "startingStop": "Chennai Central",
    "endingStop": "Tambaram"
  }
]
```

---

### GET /api/routes/{id}
Returns a single route.

**Response `200`** — Same shape as above.
**Response `404`** — Route not found.

---

### POST /api/routes
Creates a new route.

**Request Body**
```json
{
  "routeCode": "21G",
  "routeName": "Central - Tambaram",
  "createdBy": "admin"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| routeCode | string | Yes | Must be unique, max 20 chars |
| routeName | string | Yes | Max 100 chars |
| createdBy | string? | No | Username |

**Response `201`** — Returns created route object.

---

### PUT /api/routes/{id}
Updates a route.

**Request Body**
```json
{
  "routeCode": "21G",
  "routeName": "Central - Tambaram",
  "isActive": true,
  "modifiedBy": "admin"
}
```

**Response `200`** — Returns updated route object.
**Response `404`** — Route not found.

---

### DELETE /api/routes/{id}
Deletes a route.

**Response `204`** — Deleted.
**Response `404`** — Route not found.

---

## 3. Route Stop Mapping

### GET /api/routes/{routeId}/stops
Returns all stops on a route in sequence order.

**Response `200`**
```json
[
  {
    "routeStopId": 1,
    "stopId": 1,
    "stopCode": "CHN-CTL",
    "stopName": "Chennai Central",
    "stopOrder": 1,
    "distanceFromPreviousKm": null,
    "isFirstStop": true,
    "isLastStop": false
  },
  {
    "routeStopId": 2,
    "stopId": 5,
    "stopCode": "PARK",
    "stopName": "Park",
    "stopOrder": 2,
    "distanceFromPreviousKm": 2.1,
    "isFirstStop": false,
    "isLastStop": false
  }
]
```

> `isFirstStop` and `isLastStop` are derived — the stop with the lowest `stopOrder` is first, highest is last.

---

### POST /api/routes/{routeId}/stops
Adds a stop to a route.

**Request Body**
```json
{
  "stopId": 5,
  "stopOrder": 2,
  "distanceFromPreviousKm": 2.1
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| stopId | int | Yes | Must be an existing stop |
| stopOrder | int | Yes | Position in sequence, must be unique per route |
| distanceFromPreviousKm | number? | No | Distance from the previous stop |

**Response `200`** — Returns the added route stop object.
**Response `400`** — Invalid stop or duplicate order.

---

### PUT /api/routes/{routeId}/stops/reorder
Reorders stops on a route in bulk.

**Request Body**
```json
{
  "stops": [
    { "stopId": 1, "stopOrder": 1 },
    { "stopId": 5, "stopOrder": 2 },
    { "stopId": 9, "stopOrder": 3 }
  ]
}
```

**Response `204`** — Reordered successfully.

---

### DELETE /api/routes/{routeId}/stops/{stopId}
Removes a stop from a route.

**Response `204`** — Removed.
**Response `404`** — Mapping not found.

---

## 4. Route Search (Direct)

### GET /api/routes/search
Finds all direct routes that serve both stops, where the from-stop comes before the to-stop.

**Query Params**
| Param | Type | Required |
|---|---|---|
| fromStopId | int | Yes |
| toStopId | int | Yes |

**Example:** `GET /api/routes/search?fromStopId=1&toStopId=25`

**Response `200`**
```json
{
  "fromStop": "Chennai Central",
  "toStop": "Tambaram",
  "routes": [
    {
      "routeId": 1,
      "routeCode": "21G",
      "routeName": "Central - Tambaram",
      "boardingStopOrder": 1,
      "destinationStopOrder": 18,
      "distanceKm": 28.4,
      "fare": null
    }
  ]
}
```

> `fare` will be `null` here — use `/api/fares/calculate` to get the fare for a specific route.

**Response `404`** — One or both stops not found.

---

## 5. Smart Route Search (Multi-leg)

### GET /api/routes/smart-search
Finds the best route between two stops, including multi-leg journeys with transfers. Uses Dijkstra's algorithm.

**Query Params**
| Param | Type | Required | Default | Options |
|---|---|---|---|---|
| fromStopId | int | Yes | — | — |
| toStopId | int | Yes | — | — |
| criteria | string | No | `ShortestDistance` | `ShortestDistance`, `FewestStops`, `FewestTransfers` |

**Example:** `GET /api/routes/smart-search?fromStopId=1&toStopId=40&criteria=FewestTransfers`

**Response `200`**
```json
{
  "from": "Chennai Central",
  "to": "Chengalpattu",
  "totalDistanceKm": 45.2,
  "totalStops": 22,
  "transfers": 1,
  "segments": [
    {
      "routeCode": "21G",
      "routeName": "Central - Tambaram",
      "fromStop": "Chennai Central",
      "toStop": "Tambaram",
      "stops": 18,
      "distanceKm": 28.4
    },
    {
      "routeCode": "108",
      "routeName": "Tambaram - Chengalpattu",
      "fromStop": "Tambaram",
      "toStop": "Chengalpattu",
      "stops": 4,
      "distanceKm": 16.8
    }
  ]
}
```

> `transfers` = number of bus changes (segments - 1).
> A `transfers` value of `0` means a direct route was found.

**Response `404`** — No route found between the stops.

---

## 6. Fares

### GET /api/fares
Returns all fare records.

**Response `200`**
```json
[
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
]
```

---

### GET /api/fares/{id}
Returns a single fare record.

**Response `200`** — Same shape as above.
**Response `404`** — Fare not found.

---

### GET /api/fares/route/{routeId}
Returns all fare records for a specific route. Useful for building a fare matrix.

**Response `200`** — Array of fare objects (same shape as above).

---

### POST /api/fares
Creates a fare record.

**Request Body**
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

| Field | Type | Required | Notes |
|---|---|---|---|
| routeId | int | Yes | Must be an existing route |
| fromStopId | int | Yes | Must be an existing stop on the route |
| toStopId | int | Yes | Must be an existing stop on the route |
| fareAmount | decimal | Yes | e.g. `25.00` |
| effectiveFrom | datetime? | No | UTC datetime |
| effectiveTo | datetime? | No | UTC datetime, null = no expiry |

**Response `201`** — Returns created fare object.

---

### PUT /api/fares/{id}
Updates a fare record.

**Request Body**
```json
{
  "fareAmount": 30.00,
  "effectiveFrom": "2024-06-01T00:00:00Z",
  "effectiveTo": null,
  "isActive": true
}
```

**Response `200`** — Returns updated fare object.
**Response `404`** — Fare not found.

---

### DELETE /api/fares/{id}
Deletes a fare record.

**Response `204`** — Deleted.
**Response `404`** — Fare not found.

---

## 7. Fare Calculation

### GET /api/fares/calculate
Calculates the fare for a known route between two stops.

**Query Params**
| Param | Type | Required |
|---|---|---|
| routeId | int | Yes |
| fromStopId | int | Yes |
| toStopId | int | Yes |

**Example:** `GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=18`

**Response `200`**
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

> `fare` will be `0` if no fare record exists for that stop pair.

**Response `404`** — Route or stop not found.

---

### GET /api/fares/calculate-smart
Calculates the total fare for a multi-leg smart route journey.

**Query Params**
| Param | Type | Required |
|---|---|---|
| fromStopId | int | Yes |
| toStopId | int | Yes |

**Example:** `GET /api/fares/calculate-smart?fromStopId=1&toStopId=40`

**Response `200`**
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
    },
    {
      "routeCode": "108",
      "fromStop": "Tambaram",
      "toStop": "Chengalpattu",
      "fare": 10.00
    }
  ],
  "totalFare": 35.00
}
```

**Response `404`** — No route found.

---

## Data Types Reference

### Stop object
| Field | Type | Notes |
|---|---|---|
| stopId | int | Primary key |
| stopCode | string | Unique identifier code |
| stopName | string | Full display name |
| shortName | string? | Abbreviated name |
| latitude | number? | GPS latitude |
| longitude | number? | GPS longitude |
| isActive | bool | Whether stop is in service |

### Route object
| Field | Type | Notes |
|---|---|---|
| routeId | int | Primary key |
| routeCode | string | Unique route number e.g. "21G" |
| routeName | string | Display name |
| isActive | bool | Whether route is in service |
| startingStop | string? | Name of first stop |
| endingStop | string? | Name of last stop |

### RoutingCriteria enum
| Value | Behaviour |
|---|---|
| `ShortestDistance` | Minimises total km travelled |
| `FewestStops` | Minimises number of stops |
| `FewestTransfers` | Minimises number of bus changes |

---

## Suggested UI Call Patterns

### Populate a stop dropdown
```
GET /api/stops
```
Filter `isActive === true` on the client side.

### Populate a route dropdown
```
GET /api/routes
```
Filter `isActive === true` on the client side.

### Route mapping screen — load existing stops for a route
```
GET /api/routes/{routeId}/stops
```

### Route search screen
1. User selects From/To stops → `GET /api/routes/search?fromStopId=X&toStopId=Y`
2. If no results → `GET /api/routes/smart-search?fromStopId=X&toStopId=Y`

### Fare calculator screen
1. User selects route + from/to → `GET /api/fares/calculate?routeId=X&fromStopId=Y&toStopId=Z`
2. For smart journey fare → `GET /api/fares/calculate-smart?fromStopId=X&toStopId=Y`

### Fare matrix screen
1. `GET /api/routes/{routeId}/stops` — to get the stop list for the matrix axes
2. `GET /api/fares/route/{routeId}` — to get all fare pairs, then build the matrix client-side
