# Production deployment

- URL: **https://wecapture.geoplanph.com**
- Docker Hub image: **geoplanoperation/wecapture:latest**
- VPS directory: **/home/geo/docker-apps/wecapture-docker**
- Compose service/container: **wecapture** / **wecapture**

There is no database. Photos and previews live in Cloudflare R2; leads are
appended to `/data/leads.csv` on a persistent Docker volume.

## CI/CD

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) follows GeoBook's
Docker Hub → SSH → Docker Compose deployment pattern:

1. Pull requests and pushes to `main` run `pnpm lint`, `pnpm build`, and the
   end-to-end Docker smoke test. The smoke test uses a temporary S3 stand-in,
   not production R2 credentials or a database.
2. Only after both CI jobs pass, a push to `main` builds and publishes
   `geoplanoperation/wecapture:latest` and `:sha-<commit>`.
3. SSH connects to the VPS, pulls the commit-specific image, and recreates
   only `wecapture`. Compose waits up to 120 seconds for the image's `/api/health`
   health check. A failed health check fails the workflow and prints logs;
   it does not automatically roll back.

You can also run the workflow manually on `main` from GitHub Actions. Other
branches never publish or deploy. Deployments are serialized to avoid
interrupting an in-progress Compose update.

### GitHub Actions secrets

In the **we-capture repository → Settings → Secrets and variables → Actions**,
configure these secrets (using password authentication for the VPS):

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub user with push access to `geoplanoperation/wecapture` |
| `DOCKERHUB_TOKEN` | Docker Hub access token with push permission |
| `VPS_HOST` | VPS hostname or IP reachable from GitHub-hosted runners |
| `VPS_USERNAME` | `geo` |
| `VPS_PASSWORD` | SSH login password for the VPS user (`geo`) |

The workflow uses SSH port 22 with password authentication. The VPS SSH server
must allow password authentication for `geo`. Store the password only as a
GitHub Actions secret, not in the workflow or Compose file; `VPS_SSH_KEY` is
not required.

The VPS user needs Docker access, the Docker
Compose v2 plugin with `--wait` support, and read access to the deployed image.
If the Docker Hub repository is private, run `docker login` once **as `geo`**
on the VPS using a read-only Docker Hub token; the runner's registry login
is not transferred to the VPS.

## One-time VPS setup

Use [`docker-compose.prod.yml`](../docker-compose.prod.yml) as the complete
replacement for the VPS's existing `docker-compose.yml`. Since the service
changes from `api` to `wecapture`, stop and remove the old container before
installing the replacement (do not
remove volumes):

```bash
ssh geo@srv943158 'cd ~/docker-apps/wecapture-docker && docker compose stop api && docker compose rm -f api'
```

This causes downtime until the first deployment completes; schedule the change
outside an event. Back up any existing leads first.

The replacement file is standalone, not an overlay for the local development
Compose file. The workflow does not
copy Compose or `.env` files: install them before the first deployment and
update the server copy whenever the production configuration changes.

From your local checkout (replace `srv943158` with a reachable VPS address if
needed):

```bash
ssh geo@srv943158 'mkdir -p ~/docker-apps/wecapture-docker'
scp docker-compose.prod.yml geo@srv943158:~/docker-apps/wecapture-docker/docker-compose.yml
scp .env.example geo@srv943158:~/docker-apps/wecapture-docker/.env
```

**Only copy `.env.example` during initial setup. Do not overwrite an existing
production `.env` containing credentials.** On the VPS:

```bash
cd ~/docker-apps/wecapture-docker
chmod 600 .env
nano .env
```

Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET`.
Leave `R2_ENDPOINT` empty for Cloudflare R2. Compose explicitly sets
`PUBLIC_BASE_URL=https://wecapture.geoplanph.com` and
`LEADS_CSV_PATH=/data/leads.csv`, so local-development values cannot override
them. R2 credentials stay on the VPS; they are not baked into the image or
needed by CI.

Ensure `wecapture.geoplanph.com` resolves to the VPS, the external Docker
network `geo-network` exists, and Traefik is attached to it. This configuration
assumes Traefik entrypoints named `web` (HTTP) and `websecure` (HTTPS).
It keeps the existing `tls=true` approach: certificate provisioning must
already be configured in Traefik. If your installation requires an explicit
certificate resolver per router, add this label using its actual name:

```yaml
- "traefik.http.routers.wecapture-prod.tls.certresolver=YOUR_RESOLVER"
```

Validate the configuration, then push to `main` to publish and deploy:

```bash
docker compose config --quiet
```

After the image has been published, a manual deployment is also possible:

```bash
cd ~/docker-apps/wecapture-docker
export TAG=latest
docker compose pull wecapture
docker compose up -d --no-deps --force-recreate --wait --wait-timeout 120 wecapture
curl --fail https://wecapture.geoplanph.com/api/health
```

## Changes from the old VPS Compose file

- Remove `version: "3.8"`; modern Compose no longer needs it.
- Route the **whole hostname**, not just the `/v1/api` prefix. Next.js serves
  the booth at `/`, downloads at `/d/<id>`, assets at `/_next/*`, and handlers
  at `/api/*`. No prefix stripping middleware is needed.
- Change Traefik's upstream port from **8081 to 3000**. No host port needs to
  be published: Traefik reaches the container over `geo-network`.
- Add `.env` for server-side R2 configuration and fix the public origin.
- Remove `./public:/usr/src/app/public:rw`. This image runs from `/app`, with
  event assets already included in `/app/public`; runtime photos go to R2.
- Mount `wecapture-data:/data` so the leads CSV survives image updates.
- Redirect HTTP on a separate `web` router with an app-specific middleware
  name, avoiding a shared `redirect-to-https` definition used by other apps.
- Allow an optional `TAG` override for exact-commit deployment or rollback;
  with no override the image remains `geoplanoperation/wecapture:latest`.

Keep only one production `wecapture` replica because leads use a local CSV.
Back up that volume; do **not** run `docker compose down -v` in production. If leads
already exist elsewhere, back them up and migrate them to `/data/leads.csv`
with ownership writable by the container's `node` user (UID 1000).

Allow request bodies of at least **200 MB** through any proxy/CDN on
`/api/upload/*`: the booth PUTs the full PNG there after the QR is shown. The health check confirms the HTTP server is running, not that
R2 credentials are valid: test the full booth → QR → download flow after the
first deployment.

## Logs, leads backup, and rollback

```bash
cd ~/docker-apps/wecapture-docker
docker compose ps
docker compose logs --tail 100 wecapture
# Run after the first lead exists; the CSV contains personal information.
docker cp wecapture:/data/leads.csv ./leads-backup.csv
chmod 600 ./leads-backup.csv
```

To roll back, find a previous successful commit in GitHub Actions:

```bash
cd ~/docker-apps/wecapture-docker
export TAG=sha-PASTE_PREVIOUS_FULL_COMMIT_SHA
docker compose pull wecapture
docker compose up -d --no-deps --force-recreate --wait --wait-timeout 120 wecapture
```

The pipeline exports the SHA tag for each deployment without editing `.env`.
For a persistent manual pin, set `TAG=sha-...` in the VPS `.env` and avoid
running `up` with a different shell override. A subsequent successful pipeline
deployment intentionally replaces that pin with its own commit.
