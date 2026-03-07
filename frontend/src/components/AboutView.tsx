export const AboutView = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Hero Section */}
      <div className="card text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          About DeCo
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          The world's first fully decentralized startup accelerator built on Stellar blockchain, 
          empowering founders, VCs, and communities to collaborate transparently.
        </p>
      </div>

      {/* Mission Section */}
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-4">
          DeCo (Decentralized Combinator) revolutionizes the traditional accelerator model by removing 
          intermediaries and creating a transparent, community-driven funding ecosystem. We believe that 
          great ideas deserve funding based on merit, not connections.
        </p>
        <p className="text-lg text-gray-700 leading-relaxed">
          By leveraging blockchain technology, we ensure every decision is transparent, every vote counts, 
          and every transaction is secure. Our platform democratizes access to venture capital while 
          maintaining the highest standards of due diligence through community governance.
        </p>
      </div>

      {/* How It Works */}
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">How DeCo Works</h2>
        
        <div className="space-y-8">
          {/* Step 1 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                1
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Founders Apply</h3>
              <p className="text-gray-700 leading-relaxed">
                Startup founders submit applications with project details, team info, and funding goals. 
                Metadata is stored on IPFS for decentralized storage. A 10 XLM fee prevents spam.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                2
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community Votes</h3>
              <p className="text-gray-700 leading-relaxed">
                Every application enters a 7-day public voting period. Any Stellar wallet holder can vote 
                Yes or No on applications. This DAO governance ensures community-driven decision making 
                with complete transparency on the blockchain.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                3
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Approves</h3>
              <p className="text-gray-700 leading-relaxed">
                After the voting period, the admin reviews community votes and project quality to make 
                final approval decisions. This combines community wisdom with expert oversight for optimal 
                startup selection.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                4
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">VCs Stake & Invest</h3>
              <p className="text-gray-700 leading-relaxed">
                Venture capitalists stake 1000 XLM to become verified (fully decentralized, no admin 
                approval needed). Verified VCs can then invest directly in approved startups with any 
                amount they choose. All investments are recorded on-chain.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                5
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Founders Receive Funding</h3>
              <p className="text-gray-700 leading-relaxed">
                Once VCs invest, funds are held in the smart contract. Founders can claim their allocated 
                funds directly to their wallet. The system supports milestone-based releases for progressive 
                funding as startups hit their goals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Key Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Decentralized Governance</h3>
            <p className="text-gray-700">
              Community-driven DAO voting system ensures democratic decision-making. Every wallet holder 
              has a voice in selecting which startups receive funding.
            </p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Transparent Operations</h3>
            <p className="text-gray-700">
              All transactions, votes, and funding decisions are recorded on the Stellar blockchain, 
              providing complete transparency and immutability.
            </p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Direct Investment</h3>
            <p className="text-gray-700">
              VCs invest directly in startups without intermediaries. No platform fees, no hidden costs. 
              Funds flow directly from investors to founders.
            </p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">IPFS Storage</h3>
            <p className="text-gray-700">
              Application metadata stored on IPFS ensures decentralized, permanent, and cost-effective 
              data storage with 95% reduction in on-chain storage costs.
            </p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Contract Security</h3>
            <p className="text-gray-700">
              Built with Rust and Soroban SDK featuring reentrancy guards, checked math, and emergency 
              pause mechanisms for maximum security.
            </p>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Native XLM</h3>
            <p className="text-gray-700">
              Uses Stellar's native XLM token for all transactions. No trustlines needed, making it 
              simple and accessible for everyone.
            </p>
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Technology Stack</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Smart Contract</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• Rust Programming Language</li>
              <li>• Soroban SDK 21.7.0</li>
              <li>• Stellar Testnet</li>
              <li>• Security-first design</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Frontend</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• React 18 + TypeScript</li>
              <li>• Vite Build Tool</li>
              <li>• Tailwind CSS</li>
              <li>• React Query</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Infrastructure</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• IPFS (Pinata)</li>
              <li>• Freighter Wallet</li>
              <li>• Stellar Horizon API</li>
              <li>• Vercel Hosting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Why Choose DeCo?</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">For Founders</h3>
            <ul className="space-y-2 text-gray-700 ml-6">
              <li>• Access to global VC network without geographical barriers</li>
              <li>• Fair evaluation based on merit and community support</li>
              <li>• Fast application process with blockchain efficiency</li>
              <li>• Direct funding without intermediary fees</li>
              <li>• Transparent milestone tracking and fund release</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">For VCs</h3>
            <ul className="space-y-2 text-gray-700 ml-6">
              <li>• Discover pre-vetted startups approved by community</li>
              <li>• Invest directly with complete transparency</li>
              <li>• No platform fees or hidden costs</li>
              <li>• Portfolio tracking on blockchain</li>
              <li>• Participate in decentralized governance</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">For Community</h3>
            <ul className="space-y-2 text-gray-700 ml-6">
              <li>• Vote on promising startups and shape the ecosystem</li>
              <li>• Transparent view of all applications and funding</li>
              <li>• Participate in DAO governance</li>
              <li>• Support innovation in Web3 space</li>
              <li>• Build reputation as early supporter</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="card bg-blue-50 border-blue-300">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Platform Statistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
            <div className="text-gray-700 font-medium">Decentralized</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">7 Days</div>
            <div className="text-gray-700 font-medium">Voting Period</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">0%</div>
            <div className="text-gray-700 font-medium">Platform Fees</div>
          </div>

          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">95%</div>
            <div className="text-gray-700 font-medium">Storage Savings</div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Security & Trust</h2>
        
        <div className="space-y-4 text-gray-700">
          <p className="leading-relaxed">
            <strong className="text-gray-900">Smart Contract Security:</strong> Our Rust-based smart 
            contract includes reentrancy guards, checked math for overflow protection, and emergency 
            pause mechanisms. All fund movements are protected with multiple security layers.
          </p>
          
          <p className="leading-relaxed">
            <strong className="text-gray-900">Transparent Operations:</strong> Every transaction, vote, 
            and decision is recorded on the Stellar blockchain, providing an immutable audit trail that 
            anyone can verify.
          </p>
          
          <p className="leading-relaxed">
            <strong className="text-gray-900">Testnet Deployment:</strong> Currently deployed on Stellar 
            Testnet for safe testing and development. Mainnet deployment will follow comprehensive 
            security audits.
          </p>
          
          <p className="leading-relaxed">
            <strong className="text-gray-900">Open Source:</strong> Our code is open source and available 
            on GitHub for community review and contributions, ensuring transparency and collaborative 
            improvement.
          </p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center rounded-lg p-12 border-2 border-blue-300 shadow-md">
        <h2 className="text-3xl font-bold mb-4 text-white">Ready to Get Started?</h2>
        <p className="text-xl mb-8 text-white">
          Join the decentralized accelerator revolution today
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a 
            href="https://github.com/neelpote/deco-stellar-accelerator" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            View on GitHub
          </a>
          <a 
            href="https://stellar.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-blue-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-900 transition-colors border-2 border-white"
          >
            Learn About Stellar
          </a>
        </div>
      </div>
    </div>
  );
};
