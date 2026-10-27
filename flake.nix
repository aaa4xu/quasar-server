{
  description = "quasar-server development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };

          # Dockerfile uses node:25, but Node 25 is EOL and removed from
          # nixpkgs. Node 24 is the current LTS and runs the project fine.
          nodejs = pkgs.nodejs_24;

          # Dockerfile pins pnpm@10.23.0; nixpkgs' pnpm_10 is API/lockfile
          # compatible (the lockfile is version 9.0).
          pnpm = pkgs.pnpm_10;

          # Starts a throwaway local PostgreSQL cluster matching the default
          # POSTGRES_URL (postgres://quasar:quasar@localhost/quasar).
          pgStart = pkgs.writeShellScriptBin "quasar-pg-start" ''
            set -euo pipefail

            if [ "$(id -u)" -eq 0 ]; then
              echo "error: PostgreSQL refuses to run as root." >&2
              echo "Run 'nix develop' as a regular user, or set POSTGRES_URL to an existing database." >&2
              exit 1
            fi

            export PGDATA="''${PGDATA:-$PWD/.pgdata}"

            if [ ! -f "$PGDATA/PG_VERSION" ]; then
              echo "initializing PostgreSQL cluster in $PGDATA"
              initdb -D "$PGDATA" --auth=trust --username=postgres >/dev/null
            fi

            if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
              # nixpkgs' PostgreSQL defaults to the /run/postgresql socket
              # directory, which is not writable in a dev shell.
              pg_ctl -D "$PGDATA" -l "$PGDATA/server.log" -o "-k $PGDATA" -w start >/dev/null
            fi

            if ! psql -h localhost -U postgres -tAc \
              "SELECT 1 FROM pg_roles WHERE rolname = 'quasar'" | grep -q 1; then
              psql -h localhost -U postgres -c \
                "CREATE ROLE quasar LOGIN PASSWORD 'quasar'" >/dev/null
            fi

            if ! psql -h localhost -U postgres -tAc \
              "SELECT 1 FROM pg_database WHERE datname = 'quasar'" | grep -q 1; then
              psql -h localhost -U postgres -c \
                "CREATE DATABASE quasar OWNER quasar" >/dev/null
            fi

            echo "PostgreSQL is running (PGDATA=$PGDATA)"
            echo "POSTGRES_URL=postgres://quasar:quasar@localhost/quasar"
          '';

          pgStop = pkgs.writeShellScriptBin "quasar-pg-stop" ''
            set -euo pipefail

            export PGDATA="''${PGDATA:-$PWD/.pgdata}"

            if [ -f "$PGDATA/PG_VERSION" ] && pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
              pg_ctl -D "$PGDATA" -w stop >/dev/null
              echo "PostgreSQL stopped"
            else
              echo "PostgreSQL is not running"
            fi
          '';
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs
              pnpm

              # Needed by @v3rt3p/types (github: dependency) during install
              git
              cacert

              # Native dependency build toolchain (@discordjs/opus)
              python3
              gnumake
              stdenv.cc
              pkg-config
              libopus
              openssl

              # Proto generation (pnpm run generate-proto)
              buf
              protobuf

              # Local PostgreSQL (default POSTGRES_URL points at localhost)
              postgresql
              pgStart
              pgStop
            ];

            shellHook = ''
              export PATH="$PWD/node_modules/.bin:$PATH"

              # Do not let a globally set NODE_ENV=production hide devDependencies.
              unset NODE_ENV

              echo "quasar-server dev shell"
              echo "  node: $(node --version), pnpm: $(pnpm --version)"

              if [ -z "''${QUASAR_SKIP_INSTALL:-}" ]; then
                if [ ! -f node_modules/.modules.yaml ] \
                  || [ pnpm-lock.yaml -nt node_modules/.modules.yaml ]; then
                  echo "  installing dependencies (pnpm install --frozen-lockfile)..."
                  pnpm install --frozen-lockfile
                fi
              fi

              echo ""
              echo "  start database: quasar-pg-start   (or set POSTGRES_URL)"
              echo "  stop database:  quasar-pg-stop"
              echo "  start server:   pnpm start"
              echo "  generate proto: pnpm run generate-proto"
              echo "  skip install:   QUASAR_SKIP_INSTALL=1 nix develop"
              echo ""
            '';
          };
        });
    };
}
