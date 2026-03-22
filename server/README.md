# Collaboration Server

Optional backend for the Civil BIM Viewer that provides:

- **GitHub OAuth** authentication
- **Remote annotation storage** (save/load across sessions)
- **Shareable viewpoint links** (URL-encoded camera state)

## Prerequisites

- Node.js ≥ 18
- A [GitHub OAuth App](https://github.com/settings/developers) (for login)

## Setup

```bash
cd server
npm install
```

## Configuration

Set environment variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | Server port |
| `GITHUB_CLIENT_ID` | Yes (for OAuth) | — | GitHub OAuth App client ID |
| `GITHUB_SECRET` | Yes (for OAuth) | — | GitHub OAuth App client secret |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `JWT_SECRET` | No | `dev-secret...` | Secret for signing session tokens |

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/github` | No | Exchange GitHub OAuth code for token |
| `GET` | `/api/auth/me` | Yes | Get current user info |
| `GET` | `/api/projects/:id/annotations` | Yes | Get project annotations |
| `PUT` | `/api/projects/:id/annotations` | Yes | Replace project annotations |
| `POST` | `/api/projects/:id/viewpoints` | Yes | Create shareable viewpoint |
| `GET` | `/api/projects/:id/viewpoints/:vpId` | No | Get viewpoint by ID |

## IMPORTANT

**This server is OPTIONAL.** The Civil BIM Viewer works fully standalone without it. Annotations are stored in `localStorage` when the server is not available.

## Rate Limiting

- 100 requests per 15 minutes per IP
- File upload limit: 5 MB JSON body

## Security

- CORS restricted to configured origin
- Input validation on all endpoints
- Project IDs: alphanumeric + dashes/underscores, max 64 chars
- HTML special characters sanitized from user input
- Session tokens: 256-bit random, 24h expiry
