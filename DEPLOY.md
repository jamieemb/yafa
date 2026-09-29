# Deploying YAFA

YAFA ships as a single Docker image at **`ghcr.io/jamieemb/yafa`**, multi-arch
(`linux/amd64`, `linux/arm64`). All you need is a host with Docker.

## Quickstart — one command

```bash
docker run -d \
  --name yafa \
  --restart unless-stopped \
  -p 3000:3000 \
  -v yafa-data:/data \
  ghcr.io/jamieemb/yafa:latest
```

Open http://localhost:3000 — empty dashboard, ready to use.

That's it. The named volume `yafa-data` holds your SQLite database; the
container creates the schema on first start.

## With Docker Compose

Save this to `docker-compose.yml` somewhere on the host:

```yaml
services:
  yafa:
    image: ghcr.io/jamieemb/yafa:latest
    container_name: yafa
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - yafa-data:/data
    environment:
      DATABASE_URL: file:/data/yafa.db

volumes:
  yafa-data:
```

Then:

```bash
docker compose up -d
docker compose logs -f yafa
```

## Updating to a new release

```bash
docker compose pull
docker compose up -d
```

The schema is auto-synced on each start (`prisma db push` runs in the
entrypoint), so new fields/tables appear without manual migration.

## Backing up

The whole database is one file inside the named volume:

```bash
docker run --rm \
  -v yafa-data:/data \
  -v "$(pwd)":/backup \
  alpine tar czf /backup/yafa-$(date +%F).tar.gz -C /data .
```

This drops a `yafa-YYYY-MM-DD.tar.gz` next to wherever you ran the command.

## Restoring

```bash
docker run --rm \
  -v yafa-data:/data \
  -v "$(pwd)":/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/yafa-YYYY-MM-DD.tar.gz -C /data"

docker compose restart yafa
```

## Available tags

| Tag                | What you get                              |
| ------------------ | ----------------------------------------- |
| `latest`           | Latest commit on `main`                   |
| `vX.Y.Z`           | A specific release                        |
| `sha-<git-sha>`    | A specific commit                         |
| `main`             | Same as `latest` but explicit             |

For production, pin to a `vX.Y.Z` tag rather than `latest` so you control
when updates land.

## Custom port / database location

```bash
docker run -d \
  -p 4040:3000 \
  -e DATABASE_URL=file:/data/custom.db \
  -v /opt/yafa-data:/data \
  ghcr.io/jamieemb/yafa:latest
```

A bind mount (`-v /opt/yafa-data:/data`) is fine but the host directory
needs to be writable by uid `1001` (the in-container user):

```bash
sudo mkdir -p /opt/yafa-data
sudo chown 1001:1001 /opt/yafa-data
```

Named volumes (`-v yafa-data:/data`) skip this step entirely — Docker
manages permissions automatically. Recommended unless you have a specific
reason to bind-mount.

## Install on iPhone / iPad

YAFA is a Progressive Web App, so it runs as a standalone app from the
home screen — full screen, its own icon and splash screen, no Safari
chrome.

1. Serve it over **HTTPS** (see below). Adding to the home screen works
   over plain HTTP, but the service worker and several web APIs need a
   secure origin.
2. Open the site in **Safari** on the device (other iOS browsers can't
   install web apps).
3. Tap **Share → Add to Home Screen → Add**.

Launch it from the icon. Long-press the icon for the shortcuts (Review,
Transactions, Import). If you change the icon or splash images, run
`node scripts/generate-pwa-assets.mjs` and redeploy; iOS refreshes them
on the next install.

### HTTPS with Tailscale

If your devices are on a tailnet, Tailscale can terminate TLS for you
with a real certificate and no ports opened to the internet:

```bash
tailscale serve --bg 3000
```

Then browse to `https://<host>.<tailnet>.ts.net`. See the Tailscale
docs for `tailscale cert` if you'd rather feed the certificate to your
own reverse proxy.

## Reverse proxy

The container speaks plain HTTP on `:3000`. Front it with nginx, Caddy,
Traefik, or whatever you already run. Example Caddyfile snippet:

```
yafa.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

There's no auth in v1, so make sure your proxy is bound to LAN/Tailscale
or fronts the app with basic auth until app-level auth lands.

## Building from source (developers only)

```bash
git clone https://github.com/jamieemb/yafa.git
cd yafa
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

The dev compose layers a local `build:` and a bind-mount on `./data` so
you can poke at the SQLite file directly.
