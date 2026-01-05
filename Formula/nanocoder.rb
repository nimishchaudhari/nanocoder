class Nanocoder < Formula
  desc "Local-first CLI coding agent with multi-provider support"
  homepage "https://github.com/Nano-Collective/nanocoder"
  url "https://registry.npmjs.org/@nanocollective/nanocoder/-/nanocoder-1.20.1.tgz"
  sha256 "9c068031f58a11edf9bda1de2d04d20ec979a773c4a5d295db49968877233945"
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
