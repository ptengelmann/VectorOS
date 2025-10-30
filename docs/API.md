# VectorOS API Documentation

## Base URLs

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **AI Core API**: `http://localhost:8000`

## Authentication

Currently using JWT tokens (Clerk integration planned).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Backend API Endpoints

### Health Check

**GET** `/health`

Returns the health status of the backend service.

**Response:**
```json
{
  "status": "ok",
  "service": "vectoros-backend",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### API Info

**GET** `/api/v1`

Returns API version information.

**Response:**
```json
{
  "message": "VectorOS API v1",
  "version": "0.1.0"
}
```

---

## AI Core API Endpoints

### Health Check

**GET** `/health`

Returns the health status of the AI core service.

**Response:**
```json
{
  "status": "ok",
  "service": "vectoros-ai-core",
  "model": "claude-3-5-sonnet-20241022"
}
```

### Chat

**POST** `/api/v1/chat`

Send a message to the AI assistant.

**Request Body:**
```json
{
  "message": "How can I improve my sales pipeline?",
  "context": {
    "workspace_id": "uuid",
    "user_id": "uuid"
  }
}
```

**Response:**
```json
{
  "response": "Based on your pipeline data, here are some recommendations...",
  "confidence": 0.95
}
```

### Generate Insights

**POST** `/api/v1/insights`

Generate AI-powered insights from business data.

**Request Body:**
```json
{
  "workspace_id": "uuid",
  "data_type": "deals",
  "data": {
    "total_deals": 45,
    "won_deals": 12,
    "lost_deals": 8,
    "in_progress": 25,
    "average_deal_value": 15000,
    "conversion_rate": 0.27
  }
}
```

**Response:**
```json
{
  "insights": [
    {
      "title": "Conversion Rate Below Industry Average",
      "description": "Your 27% conversion rate is below the industry average of 35% for B2B SaaS.",
      "priority": "high",
      "confidence": 0.9
    }
  ],
  "recommendations": [
    {
      "title": "Implement Lead Scoring",
      "description": "Add a qualification framework to focus on high-intent leads.",
      "priority": "high",
      "confidence": 0.85
    }
  ]
}
```

---

## Planned Endpoints (Phase 1)

### Users

**POST** `/api/v1/users`
- Create new user

**GET** `/api/v1/users/:id`
- Get user profile

**PATCH** `/api/v1/users/:id`
- Update user profile

### Workspaces

**POST** `/api/v1/workspaces`
- Create workspace

**GET** `/api/v1/workspaces/:id`
- Get workspace details

**GET** `/api/v1/workspaces/:id/members`
- List workspace members

### Deals

**GET** `/api/v1/workspaces/:workspaceId/deals`
- List all deals
- Query params: `stage`, `assignedTo`, `limit`, `offset`

**POST** `/api/v1/workspaces/:workspaceId/deals`
- Create new deal

**GET** `/api/v1/deals/:id`
- Get deal details

**PATCH** `/api/v1/deals/:id`
- Update deal

**DELETE** `/api/v1/deals/:id`
- Delete deal

### Integrations

**GET** `/api/v1/workspaces/:workspaceId/integrations`
- List connected integrations

**POST** `/api/v1/workspaces/:workspaceId/integrations`
- Connect new integration

**DELETE** `/api/v1/integrations/:id`
- Disconnect integration

**POST** `/api/v1/integrations/:id/sync`
- Trigger manual sync

### Insights

**GET** `/api/v1/workspaces/:workspaceId/insights`
- Get recent insights
- Query params: `type`, `priority`, `status`

**PATCH** `/api/v1/insights/:id`
- Update insight status (viewed, actioned, dismissed)

### Analytics

**GET** `/api/v1/workspaces/:workspaceId/analytics/pipeline`
- Get pipeline metrics

**GET** `/api/v1/workspaces/:workspaceId/analytics/conversion`
- Get conversion funnel data

**GET** `/api/v1/workspaces/:workspaceId/analytics/forecast`
- Get revenue forecast

---

## WebSocket Events (Planned)

Real-time updates via WebSocket connection.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
```

### Events

**deal.created**
```json
{
  "event": "deal.created",
  "data": { /* deal object */ }
}
```

**insight.generated**
```json
{
  "event": "insight.generated",
  "data": { /* insight object */ }
}
```

**integration.synced**
```json
{
  "event": "integration.synced",
  "data": {
    "integration_id": "uuid",
    "status": "success",
    "records_synced": 42
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error context
  }
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limiting

### Development
- No rate limits

### Production (Planned)

- **Starter Tier**: 1000 requests/hour
- **Pro Tier**: 10000 requests/hour
- **Scale Tier**: 50000 requests/hour
- **Enterprise Tier**: Custom limits

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248600
```

---

## Webhooks (Planned)

Configure webhooks to receive events from VectorOS.

**Supported Events:**
- `deal.won`
- `deal.lost`
- `insight.critical`
- `integration.failed`

**Webhook Payload:**
```json
{
  "event": "deal.won",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "deal_id": "uuid",
    "value": 25000,
    "workspace_id": "uuid"
  }
}
```
