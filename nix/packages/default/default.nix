{
  lib,
  inputs,
  namespace,
  system,
  pkgs,
  stdenv,
  fetchFromGitHub,
  ...
}:

let
  version = "1.14.3";
in

stdenv.mkDerivation {
  pname = "nanocoder";
  inherit version;

  src = fetchFromGitHub {
    owner = "nano-collective";
    repo = "nanocoder";
    rev = "v${version}";
    sha256 = "sha256-OuXdv48m9PiWWJvb6hSK1Y1JBpGAu02YIM9XQSziUQI=";
  };

  buildInputs = with pkgs; [
    nodejs_20
    cacert
    makeWrapper
  ];

  buildPhase = ''
    export HOME=$PWD
    runHook preBuild

    npm install --verbose
    npm run build --verbose

    runHook postBuild
  '';

  fixupPhase = ":";

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    mkdir -p $out/node_modules
    mkdir -p $out/dist

    cp package.json $out/package.json
    cp -r dist/* $out/dist/
    cp -r node_modules/* $out/node_modules/

    cat > $out/bin/nanocoder <<EOF
      #!/usr/bin/env bash
      NODE_PATH="$out/node_modules" exec ${pkgs.nodejs_20}/bin/node "$out/dist/cli.js" "\$@"
    EOF

    chmod a+x $out/bin/nanocoder

    runHook postInstall
  '';

  meta = with lib; {
    description = "A beautiful local-first coding agent running in your terminal - built by the community for the community ⚒";
    homepage = "https://github.com/Nano-Collective/nanocoder";
    license = licenses.mit;
    maintainers = with maintainers; [ lalit64 ];
  };
}
