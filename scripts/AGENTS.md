# Scripts

Start and stop the app container (`pm-app`, port 8000). Run from anywhere; they switch to the project root.

- `start.sh` / `start.ps1` - build the image, replace any running container, start it with the `pm-data` volume at `/app/data` (SQLite DB); passes `.env` if present
- `stop.sh` / `stop.ps1` - stop and remove the container (the `pm-data` volume is kept)

Mac/Linux use the `.sh` scripts, PC uses the `.ps1` scripts.
