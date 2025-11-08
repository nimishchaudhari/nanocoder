# Updating the Nix Package

This guide explains how to update the Nix package when releasing a new version of Nanocoder.

## Prerequisites

- Nix installed with flakes enabled
- The new version already tagged and pushed to GitHub

## Quick Reference

### Option A: Automated (Recommended)

```bash
./scripts/update-nix-version.sh 1.x.x
```

This script automatically:

- Updates the version number
- Calculates the correct SHA256 hash
- Verifies the build works
- Shows you the commit commands

Then just commit and push:

```bash
git add nix/packages/default/default.nix
git commit -m "chore: update nix package to v1.x.x"
git push
```

### Option B: Manual

1. Update `version = "X.Y.Z";` in `nix/packages/default/default.nix` (line 13)
2. Use fake hash `sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` (line 24)
3. Run `nix build .#default` - it will fail and show you the correct hash
4. Copy the hash from the error message and update line 24
5. Run `nix build .#default` again - it should succeed
6. Commit and push: `git add nix/packages/default/default.nix && git commit -m "chore: update nix package to vX.Y.Z" && git push`

## Automated Process (Recommended)

### 1. Tag the Release

First, ensure your new version is tagged and pushed to GitHub.

### 2. Run the Update Script

```bash
./scripts/update-nix-version.sh 1.x.x
```

The script will automatically:

1. Update the version in `nix/packages/default/default.nix`
2. Insert a fake hash and build (to get the real hash)
3. Extract the correct hash from the error
4. Update the file with the correct hash
5. Build again to verify success
6. Test the binary
7. Show you what to commit

### 3. Commit and Push

```bash
git add nix/packages/default/default.nix
git commit -m "chore: update nix package to v1.x.x"
git push
```

Done! 🎉

---

## Manual Process

### 1. Tag the Release

First, ensure your new version is tagged and pushed to GitHub:

```bash
# Update version in package.json (if not already done)
npm version patch  # or minor, or major

# Commit and tag
git add package.json
git commit -m "chore: bump version to 1.x.x"
git tag v1.x.x
git push && git push --tags
```

### 2. Update the Nix Package File

Edit `nix/packages/default/default.nix` and update the version number:

```nix
let
  version = "1.x.x";  # ← Change this to your new version (e.g., "1.15.0")
in

stdenv.mkDerivation {
  pname = "nanocoder";
  inherit version;

  src = fetchFromGitHub {
    owner = "nano-collective";
    repo = "nanocoder";
    rev = "v${version}";
    sha256 = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";  # ← Use this fake hash for now
  };

  # ... rest of the file stays the same
}
```

**Important**: Use the fake hash `sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` for now. We'll get the real hash in the next step.

### 3. Get the Real SHA256 Hash

Now let Nix calculate the correct hash for you:

```bash
nix build .#default
```

This will fail with an error like:

```
error: hash mismatch in fixed-output derivation '/nix/store/...':
         specified: sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
            got:    sha256-w4aoLZE/ei/boabYI+DXe9DgPI+DYxplY7dRwMP2lFY=
```

**Copy the hash from the "got:" line** (e.g., `sha256-w4aoLZE/ei/boabYI+DXe9DgPI+DYxplY7dRwMP2lFY=`)

Now update the file again with the real hash:

```nix
src = fetchFromGitHub {
  owner = "nano-collective";
  repo = "nanocoder";
  rev = "v${version}";
  sha256 = "sha256-w4aoLZE/ei/boabYI+DXe9DgPI+DYxplY7dRwMP2lFY=";  # ← Paste the real hash here
};
```

### 4. Test the Build

Now that you have the correct hash, build again to verify everything works:

```bash
# Build the package (should succeed this time)
nix build .#default

# Test running it
./result/bin/nanocoder --help

# Clean up the test result
rm result
```

If the build succeeds, you're done! The package is correctly configured.

### 5. Commit the Changes

```bash
git add nix/packages/default/default.nix
git commit -m "chore: update nix package to vX.Y.Z"
git push
```

### 6. Update Flake Lock (Optional)

It's good practice to update the flake inputs periodically:

```bash
# Update all flake inputs to their latest versions
nix flake update

# Commit the updated lock file
git add flake.lock
git commit -m "chore: update flake.lock"
git push
```

---

## Release Checklist

Use this checklist when releasing a new version:

- [ ] Version updated in `package.json`
- [ ] Release tagged on GitHub (`vX.Y.Z`)
- [ ] SHA256 hash obtained for the new tag
- [ ] `version` updated in `nix/packages/default/default.nix` (line 13)
- [ ] `sha256` updated in `nix/packages/default/default.nix` (line 24)
- [ ] Package builds successfully (`nix build .#default`)
- [ ] Package runs correctly (`./result/bin/nanocoder --help`)
- [ ] Changes committed and pushed
- [ ] (Optional) `flake.lock` updated

## Troubleshooting

### Build fails with "hash mismatch"

The SHA256 hash doesn't match the actual source. Re-fetch the hash using one of the methods above.

### "error: Package 'nanocoder-X.Y.Z' is not found"

Make sure the git tag exists on GitHub. Check with:

```bash
git ls-remote --tags https://github.com/Nano-Collective/nanocoder
```

### Build succeeds but binary doesn't work

Test the build artifact:

```bash
./result/bin/nanocoder --version
./result/bin/nanocoder /help
```

Check that the version number matches what you expect.

## Additional Resources

- [Nix Package Manager Manual](https://nixos.org/manual/nix/stable/)
- [Nixpkgs Manual - Node.js](https://nixos.org/manual/nixpkgs/stable/#language-javascript)
- [Snowfall Lib Documentation](https://snowfall.org/guides/lib/)
