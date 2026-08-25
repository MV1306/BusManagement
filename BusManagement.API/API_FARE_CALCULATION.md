# Fare Calculation APIs

**Base URL:** `http://localhost:5131/api`
**Format:** JSON
**Interactive Docs:** `http://localhost:5131/swagger`

---

## 1. Calculate Fare

Calculates the fare between two stops on a route.
If `busType` is not passed, the fare is calculated using the bus type assigned to the route.
If `busType` is passed, it overrides the route's bus type and calculates for that specific type.

```
GET /api/fares/calculate
```

### Query Parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| routeId | int | Yes | ID of the route |
| fromStopId | int | Yes | ID of the boarding stop |
| toStopId | int | Yes | ID of the alighting stop |
| busType | string | No | `Ordinary`, `Express`, `Deluxe`, `AC`. Defaults to the route's bus type if not provided |

### Examples

Without busType — uses the route's own bus type:
```
GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=2
```

With busType — overrides and calculates for that specific type:
```
GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=2&busType=Ordinary
GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=2&busType=Express
GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=2&busType=Deluxe
GET /api/fares/calculate?routeId=1&fromStopId=1&toStopId=2&busType=AC
```

### Response `200 OK`

```json
{
  "routeCode": "21G",
  "busType": "AC",
  "fromStop": "Chennai Central",
  "toStop": "Park",
  "stages": 1,
  "distanceKm": 2.1,
  "fare": 12.00
}
```

| Field | Type | Notes |
|---|---|---|
| routeCode | string | Route number |
| busType | string | The bus type used for calculation — confirms which type was applied |
| fromStop | string | Boarding stop name |
| toStop | string | Alighting stop name |
| stages | int | Number of stops travelled between the two stops |
| distanceKm | number | Distance in kilometres between the two stops |
| fare | decimal | Calculated fare amount. Returns `0` if no fare is configured for that bus type and stage count |

### Response `404 Not Found`
Returned if the route or either stop does not exist.

---

## 2. Calculate Fare for All Bus Types

Calculates and returns the fare for all four bus types at once for the same stop pair.
Useful for showing a fare comparison across bus types.

```
GET /api/fares/calculate-all-types
```

### Query Parameters

| Param | Type | Required | Notes |
|---|---|---|---|
| routeId | int | Yes | ID of the route |
| fromStopId | int | Yes | ID of the boarding stop |
| toStopId | int | Yes | ID of the alighting stop |

### Example

```
GET /api/fares/calculate-all-types?routeId=1&fromStopId=1&toStopId=2
```

### Response `200 OK`

```json
{
  "routeCode": "21G",
  "fromStop": "Chennai Central",
  "toStop": "Park",
  "stages": 1,
  "distanceKm": 2.1,
  "fares": [
    { "busType": "Ordinary", "stages": 1, "distanceKm": 2.1, "fare": 5.00 },
    { "busType": "Express",  "stages": 1, "distanceKm": 2.1, "fare": 7.00 },
    { "busType": "Deluxe",   "stages": 1, "distanceKm": 2.1, "fare": 9.00 },
    { "busType": "AC",       "stages": 1, "distanceKm": 2.1, "fare": 12.00 }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| routeCode | string | Route number |
| fromStop | string | Boarding stop name |
| toStop | string | Alighting stop name |
| stages | int | Number of stops travelled between the two stops |
| distanceKm | number | Distance in kilometres between the two stops |
| fares | array | Fare entry for each bus type |
| fares[].busType | string | `Ordinary`, `Express`, `Deluxe`, `AC` |
| fares[].stages | int | Same as the parent `stages` value |
| fares[].distanceKm | number | Same as the parent `distanceKm` value |
| fares[].fare | decimal | Fare for that bus type. Returns `0` if not configured |

### Response `404 Not Found`
Returned if the route or either stop does not exist.

---

## Notes for UI

- Always check if `fare` is `0` in the response. A `0` means the admin has not configured a fare for that bus type and stage count yet. Show a message like "Fare not available" instead of displaying ₹0.
- Use endpoint 1 on the **route search result screen** where the user has already selected a route — pass the `routeId` without a `busType` to get the fare for that route's type automatically. Optionally allow the user to switch bus type using the `busType` param.
- Use endpoint 2 on the **fare calculator screen** where the user wants to compare fares across all bus types for a journey.
