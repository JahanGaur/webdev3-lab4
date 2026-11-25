# Lab 4 — Secure Connect and Communication Platform

A hand-built Node.js + Express application implementing signup/login, bcrypt password hashing, JWT authentication, protected Notes CRUD, role-based access control, Socket.IO chat, and Node.js EventEmitter events.

## 1. Requirements

- Node.js 18 or newer
- npm
- A terminal (PowerShell, Command Prompt, macOS Terminal, or Linux shell)

## 2. Install and run

1. Extract the project ZIP.
2. Open a terminal in the `secure-connect-platform` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create your local environment file:
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`

5. Open `.env` and replace `JWT_SECRET` with a long, random secret. Do not submit a real production secret.
6. Start the server:

   ```bash
   npm start
   ```

7. Open http://localhost:5000 in a browser. The page provides signup, login, Notes CRUD and chat.

The first run creates `data/users.json` and `data/notes.json` if they do not exist. These files are the local persistent data store.

## 3. Project structure

```text
secure-connect-platform/
├── data/
│   ├── notes.json
│   └── users.json
├── public/
│   ├── app.js
│   └── index.html
├── src/
│   ├── config.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   └── notes.routes.js
│   └── services/
│       ├── events.js
│       └── store.js
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## 4. System architecture

```text
Browser UI (public/index.html + app.js)
       |
       | HTTP/JSON + Authorization: Bearer JWT
       v
Express server (server.js)
       |
       +--> /api/auth --> auth.routes.js --> bcrypt + JWT
       |
       +--> JWT middleware (auth.js)
       |       |
       |       +--> /api/notes --> notes.routes.js --> store.js --> data/notes.json
       |       |
       |       +--> /api/admin --> role check --> admin.routes.js --> data/users.json
       |
       +--> EventEmitter (events.js) --> server console logs
       |
       +--> Socket.IO --> JWT handshake authentication
                         --> authenticated chat rooms/messages
```

### Request flows

**Signup:** Browser sends username, email and password → Express validates → bcrypt hashes password → user is saved → `user.registered` event is emitted.

**Login:** Browser sends email/password → server finds user → bcrypt compares password with stored hash → JWT is signed → token is returned.

**Protected Notes:** Browser sends JWT in the Authorization header → middleware verifies token → route filters notes by authenticated user's ID → operation is saved.

**Chat:** Browser connects to Socket.IO with the JWT → server verifies the token during the handshake → user joins `general` or another room → server broadcasts messages with the authenticated sender identity.

## 5. REST API reference

All request bodies should use `Content-Type: application/json`.

| Method | Endpoint | Auth? | Purpose |
|---|---|---:|---|
| GET | `/api/health` | No | Check server |
| POST | `/api/auth/signup` | No | Register |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/notes` | Yes | Get your notes |
| POST | `/api/notes` | Yes | Create a note |
| PUT | `/api/notes/:id` | Yes | Update your note |
| DELETE | `/api/notes/:id` | Yes | Delete your note |
| GET | `/api/admin/users` | Admin | List users (RBAC demo) |

### Example signup

`POST http://localhost:5000/api/auth/signup`

```json
{
  "username": "victor",
  "email": "victor@example.com",
  "password": "123456"
}
```

Expected: HTTP `201 Created`, with `message`, `user.id`, `user.username`, `user.email` and `user.role`.

### Example login

`POST http://localhost:5000/api/auth/login`

```json
{
  "email": "victor@example.com",
  "password": "123456"
}
```

Expected: HTTP `200 OK`, with a JWT in the `token` field.

### Example create note

`POST http://localhost:5000/api/notes`

Header:
```text
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

Body:
```json
{
  "title": "My First Note",
  "content": "This is my first note for Web Dev III."
}
```

Expected: HTTP `201 Created`, with note ID, title, content, owner and timestamps.

### Example get notes

`GET http://localhost:5000/api/notes`

Header:
```text
Authorization: Bearer YOUR_JWT_TOKEN
```

Expected: HTTP `200 OK` and an array containing only the logged-in user's notes.

Following the sample output in the assignment PDF (page 3), a missing or invalid token returns HTTP `403 Forbidden`. A valid user token without the required admin role also receives `403 Forbidden`.

## 6. Test checklist (Postman)

1. Start the server with `npm start`.
2. Signup using the example JSON. Confirm `201 Created`.
3. Signup with the same email again. Confirm `409 Conflict`.
4. Login with the correct password. Copy the `token`.
5. Login with an incorrect password. Confirm `401 Unauthorized`.
6. Call `GET /api/notes` without Authorization. Confirm `403`.
7. Call `GET /api/notes` with `Authorization: Bearer <token>`. Confirm `200`.
8. Create a note with `POST /api/notes`. Confirm `201`.
9. Update the note with `PUT /api/notes/<id>`. Confirm `200`.
10. Delete the note with `DELETE /api/notes/<id>`. Confirm success.
11. Create a second user and verify that the first user cannot see the second user's notes.
12. Open the app in two browser sessions, log in as two users, and send messages in the `general` room. Both sessions should receive the messages; the server terminal should log them.
13. Call `/api/admin/users` as a normal user. Confirm `403 Forbidden`.

## 7. Socket.IO events

| Event | Direction | Purpose |
|---|---|---|
| Connection handshake | Client → Server | Supplies JWT in `auth.token` |
| `chat:join` | Client → Server | Join a room |
| `chat:joined` | Server → Client | Confirms room |
| `chat:message` | Both directions | Send/receive chat message |
| `chat:error` | Server → Client | Reports invalid chat input |

The browser page is the Socket.IO client. The server verifies the JWT before allowing a socket connection. Sender identity is taken from the verified token, not trusted from the browser.

## 8. EventEmitter events

The application emits:
- `user.registered`
- `user.logged_in`
- `note.created`
- `note.updated`
- `note.deleted`

Listeners in `src/services/events.js` log these events in the server terminal.

## 9. Role-based access control (RBAC)

Every new account is assigned the `user` role. The `/api/admin/users` route requires the `admin` role. For a local practical demonstration only, you can change one user's `"role"` value to `"admin"` in `data/users.json`, restart the server, and log in again to receive a JWT containing the updated role. Do not expose a public role-changing endpoint.

## 10. Important notes

- Passwords are never stored as plain text; only bcrypt hashes are stored.
- JWT secrets are loaded from `.env`; never commit `.env`.
- Notes are scoped to the authenticated user's ID.
- Chat connections require a valid JWT.
- JSON storage is appropriate for this small classroom lab, not a production multi-user deployment. For production, use a database with transactions, stronger validation, rate limiting, HTTPS, secure secret management and operational backups.
- Keep `data/users.json` private because it contains password hashes and account information.

![1](images/Screenshot%202026-11-25%20222742.png)
![2](images/Screenshot%202026-11-25%20222910.png)
![3](images/Screenshot%202026-11-25%20223336.png)
![4](images/Screenshot%202026-11-25%20224138.png)
