{
  lib,
  inputs,
  namespace,
  system,
  pkgs,
  stdenv,
  fetchFromGitHub,
  nodejs,
  pnpm_9,
  ...
}:

let
  version = "1.16.0";
in

stdenv.mkDerivation (finalAttrs: {
  pname = "nanocoder";
  inherit version;

  src = fetchFromGitHub {
    owner = "nano-collective";
    repo = "nanocoder";
    rev = "v${version}";
    sha256 = "sha256-LGEWHt2Tv62h7UI6d9YNMm/8/PKLgwJEizcSNhfZoqk=";
  };

  nativeBuildInputs = [
    nodejs
    pnpm_9.configHook
  ];

  pnpmDeps = pnpm_9.fetchDeps {
    inherit (finalAttrs) pname version src;
    hash = "sha256-Vn7DsIczYX9quYUfF7UMEWZWB69Ce+JRvsL5AzHpeHM=";

    # Fix pnpm workspace error - add packages field to workspace file
    postPatch = ''
      echo "packages:" >> pnpm-workspace.yaml
      echo "  - ." >> pnpm-workspace.yaml
    '';
  };

  # Fix pnpm workspace error in main build too
  postPatch = ''
    echo "packages:" >> pnpm-workspace.yaml
    echo "  - ." >> pnpm-workspace.yaml
  '';

  buildPhase = ''
    runHook preBuild
    pnpm run build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    mkdir -p $out/lib/nanocoder

    # Copy built files
    cp -r dist $out/lib/nanocoder/
    cp -r node_modules $out/lib/nanocoder/
    cp package.json $out/lib/nanocoder/

    # Create wrapper script
    cat > $out/bin/nanocoder <<EOF
#!/usr/bin/env bash
NODE_PATH="$out/lib/nanocoder/node_modules" exec ${nodejs}/bin/node "$out/lib/nanocoder/dist/cli.js" "\$@"
EOF

    chmod +x $out/bin/nanocoder

    runHook postInstall
  '';

  meta = with lib; {
    description = "A beautiful local-first coding agent running in your terminal - built by the community for the community ⚒";
    homepage = "https://github.com/Nano-Collective/nanocoder";
    license = licenses.mit;
    maintainers = with maintainers; [ lalit64 ];
  };
})
