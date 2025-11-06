#!/usr/bin/env bash
# Update Nix package version and hash for a new release
# Usage: ./scripts/update-nix-version.sh <version>
# Example: ./scripts/update-nix-version.sh 1.15.0

set -e

VERSION=$1
NIX_FILE="nix/packages/default/default.nix"
FAKE_HASH="sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$VERSION" ]; then
  echo -e "${RED}Error: Version number required${NC}"
  echo "Usage: $0 <version>"
  echo "Example: $0 1.15.0"
  exit 1
fi

echo -e "${YELLOW}Updating Nix package to version ${VERSION}...${NC}"
echo ""

# Step 1: Update version in nix file
echo "Step 1: Updating version number in ${NIX_FILE}..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS requires -i '' for in-place editing
  sed -i '' "s|version = \".*\";|version = \"${VERSION}\";|" "$NIX_FILE"
else
  # Linux
  sed -i "s|version = \".*\";|version = \"${VERSION}\";|" "$NIX_FILE"
fi

# Step 2: Insert fake hash
echo "Step 2: Using fake hash to trigger hash calculation..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|sha256 = \".*\";|sha256 = \"${FAKE_HASH}\";|" "$NIX_FILE"
else
  sed -i "s|sha256 = \".*\";|sha256 = \"${FAKE_HASH}\";|" "$NIX_FILE"
fi

# Step 3: Build to get the real hash
echo "Step 3: Building package to get correct hash..."
echo -e "${YELLOW}(This will fail - that's expected!)${NC}"
echo ""

BUILD_OUTPUT=$(nix build .#default 2>&1 || true)

# Extract the hash from the error message
# Use sed instead of grep -P for macOS compatibility
REAL_HASH=$(echo "$BUILD_OUTPUT" | sed -n 's/.*got:[[:space:]]*\(sha256-[A-Za-z0-9+/=]*\).*/\1/p' | head -1)

if [ -z "$REAL_HASH" ]; then
  echo -e "${RED}Error: Could not extract hash from build output${NC}"
  echo "Build output:"
  echo "$BUILD_OUTPUT"
  exit 1
fi

echo -e "${GREEN}Found hash: ${REAL_HASH}${NC}"
echo ""

# Step 4: Update with real hash
echo "Step 4: Updating with correct hash..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|sha256 = \".*\";|sha256 = \"${REAL_HASH}\";|" "$NIX_FILE"
else
  sed -i "s|sha256 = \".*\";|sha256 = \"${REAL_HASH}\";|" "$NIX_FILE"
fi

# Step 5: Build again to verify
echo "Step 5: Verifying build with correct hash..."
if nix build .#default; then
  echo -e "${GREEN}✓ Build successful!${NC}"
  echo ""

  # Test the binary
  echo "Step 6: Testing binary..."
  if ./result/bin/nanocoder --help > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Binary works correctly!${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Binary test failed${NC}"
  fi

  # Clean up
  rm -f result

  echo ""
  echo -e "${GREEN}════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}Success! Nix package updated to v${VERSION}${NC}"
  echo -e "${GREEN}════════════════════════════════════════════════${NC}"
  echo ""
  echo "Changes made to: ${NIX_FILE}"
  echo ""
  echo "Next steps:"
  echo "  1. Review the changes: git diff ${NIX_FILE}"
  echo "  2. Commit: git add ${NIX_FILE}"
  echo "  3. Commit: git commit -m 'chore: update nix package to v${VERSION}'"
  echo "  4. Push: git push"
else
  echo -e "${RED}✗ Build failed with correct hash${NC}"
  echo "Please check the build output above for errors."
  exit 1
fi
