class Nanocoder < Formula
  desc "Local-first CLI coding agent with multi-provider support"
  homepage "https://github.com/Nano-Collective/nanocoder"
  url "https://registry.npmjs.org/@nanocollective/nanocoder/-/nanocoder-1.14.3.tgz"
  sha256 "bd463f0fd9e03d37f613e1ce5f2188c027b53422476d9ce07b0cef44443ab999"
  license "MIT"

  depends_on "node@18"

  def install
    system "npm", "install", *std_npm_args(prefix: false)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    # Test that binary exists and runs
    system "#{bin}/nanocoder", "--help"
  end
end
