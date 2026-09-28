# Pulse

Anonymous stranger matching with three separate modes:

- **Chat** uses text only and never asks for media access.
- **Audio** uses the microphone only.
- **Video** uses the camera and microphone.

Each mode has its own matchmaking queue. Calls use browser WebRTC; Socket.IO handles matching and signaling.

## Run locally

```sh
npm install
npm start
```

Open `http://localhost:3000` in two browser tabs or devices, select the same mode in each, and start matching. Localhost is treated as a secure context by modern browsers.

## Host online

Use a Node.js host that supports long-running web services and WebSocket upgrades, such as Render:

1. Push this project to a GitHub repository.
2. Create a **Web Service** from that repository.
3. Set the build command to `npm install` and the start command to `npm start`.
4. Deploy and open the HTTPS URL from two devices. The service listens on the host-provided `PORT` and exposes `/health` for health checks.

HTTPS is required for camera and microphone access. The included public STUN server can connect many networks, but reliable calls across restrictive networks require TURN. Add a TURN provider and set these environment variables in the host dashboard:

- `TURN_URLS`: comma-separated TURN URLs, for example `turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp`
- `TURN_USERNAME`: TURN username
- `TURN_CREDENTIAL`: TURN credential

TURN credentials are read by the server and returned only from `/config.json`; never put them in the browser source or commit them. Verify chat, audio, and video separately after deployment. Free hosting plans may sleep or limit concurrent connections.