class Nanocoder < Formula
  desc "Local-first CLI coding agent with multi-provider support"
  homepage "https://github.com/Nano-Collective/nanocoder"
  url "https://registry.npmjs.org/@nanocollective/nanocoder/-/nanocoder-1.19.1.tgz"
  sha256 "bf33702a59934228dea66ca876a8670693869d9ac1ffd31e9a98a46d9091e01e"
  license "MIT"

  depends_on "node@20"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    # Test that binary exists and runs
    system "#{bin}/nanocoder", "--help"
  end
end
