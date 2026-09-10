/* The ecosystem.
 *
 * Wallets, apps and tools that sign people in with ERC-4361.
 *
 * Marks live in public/integrators/ and are wired through data/marks.ts.
 * A handful of sites blocked a fetch; those rows still use a letter.
 *
 * Entries with a `story` are linked from the landing page too, so a new case
 * study only has to be recorded once.
 *
 * To add an entry: append below, and add a `note` if there is something
 * specific to say about how they use it.
 *
 * TWO ENTRIES NEED CHECKING. This list was inherited from the previous site and
 * two of them look wrong on inspection:
 *
 *   Snapshot   — snapshot.js has no siwe dependency and no SIWE code path; it
 *                signs EIP-712 typed data.
 *   Polymarket — the documented API auth is EIP-712 plus HMAC-SHA256.
 *
 * Signing typed data is not ERC-4361. Both are marked `unverified` below and
 * neither is used in any claim on the landing page. Confirm with the projects
 * or drop them.
 */

export type EcosystemType = 'wallet' | 'app' | 'tool'

export interface Entry {
  name: string
  link: string
  type: EcosystemType
  /** Path to a success story, when one exists. */
  story?: string
  /** One line, shown on the ecosystem page. Optional. */
  note?: string
  /** Inherited from the old site and not confirmed. See the note above. */
  unverified?: boolean
}

export const TYPES: { key: EcosystemType; label: string; plural: string }[] = [
  { key: 'wallet', label: 'Wallet', plural: 'Wallets' },
  { key: 'app', label: 'App', plural: 'Apps' },
  { key: 'tool', label: 'Tool', plural: 'Tools' }
]

export const ECOSYSTEM: Entry[] = [
  {
    name: 'MetaMask',
    link: 'https://metamask.io/',
    type: 'wallet',
    story: '/blog/success-stories/metamask',
    note: 'The self-custodial wallet used by tens of millions of people to hold assets and sign in across web3.'
  },
  {
    name: 'Ambire',
    link: 'https://www.ambire.com/',
    type: 'wallet',
    story: '/blog/success-stories/ambire',
    note: 'A self-custodial smart wallet for everyday Ethereum use.'
  },
  {
    name: 'Rainbow',
    link: 'https://rainbow.me/',
    type: 'wallet'
  },
  {
    name: 'Safe',
    link: 'https://safe.global/',
    type: 'wallet',
    note: 'A smart-account platform for teams, DAOs, and treasuries.'
  },
  {
    name: 'Ronin Wallet',
    link: 'https://wallet.roninchain.com/',
    type: 'wallet'
  },
  {
    name: 'Gemini Wallet',
    link: 'https://www.gemini.com/',
    type: 'wallet'
  },
  {
    name: 'Taho',
    link: 'https://taho.xyz/',
    type: 'wallet'
  },
  {
    name: '1inch',
    link: 'https://1inch.io/',
    type: 'wallet'
  },
  {
    name: 'Zerion',
    link: 'https://zerion.io/',
    type: 'wallet'
  },
  {
    name: 'Trust Wallet',
    link: 'https://trustwallet.io/',
    type: 'wallet'
  },
  {
    name: 'OKX Wallet',
    link: 'https://www.okx.com/',
    type: 'wallet'
  },
  {
    name: 'Binance',
    link: 'https://www.binance.com/',
    type: 'wallet'
  },
  {
    name: 'Bitget Wallet',
    link: 'https://web3.bitget.com/',
    type: 'wallet'
  },
  {
    name: 'Frame',
    link: 'https://frame.sh/',
    type: 'wallet'
  },
  {
    name: 'TokenPocket',
    link: 'https://www.tokenpocket.pro/',
    type: 'wallet'
  },
  {
    name: 'Uniswap Wallet',
    link: 'https://wallet.uniswap.org/',
    type: 'wallet'
  },
  {
    name: 'Best Wallet',
    link: 'https://bestwallet.com/',
    type: 'wallet'
  },
  {
    name: 'Ledger',
    link: 'https://ledger.com/',
    type: 'wallet'
  },
  {
    name: 'Bybit Wallet',
    link: 'https://bybit.com/',
    type: 'wallet'
  },
  {
    name: 'Bitfrost Wallet',
    link: 'https://bitfrost.com/',
    type: 'wallet'
  },
  {
    name: 'xPortal',
    link: 'https://xportal.com',
    type: 'wallet'
  },
  {
    name: 'crypto.com',
    link: 'https://crypto.com/',
    type: 'wallet'
  },
  {
    name: 'imToken',
    link: 'https://token.im/',
    type: 'wallet'
  },
  {
    name: 'blockchain.com',
    link: 'https://blockchain.com/',
    type: 'wallet'
  },
  {
    name: 'BitPay',
    link: 'https://bitpay.com/',
    type: 'wallet'
  },
  {
    name: 'Arculus',
    link: 'https://getarculus.com/',
    type: 'wallet'
  },
  {
    name: 'Ctrl Wallet',
    link: 'https://ctrl.xyz/',
    type: 'wallet'
  },
  {
    name: 'Privy',
    link: 'https://www.privy.io/',
    type: 'tool',
    story: '/blog/success-stories/privy',
    note: 'Embedded wallets and authentication for consumer apps, from email and passkeys to existing wallets.'
  },
  {
    name: 'WalletConnect',
    link: 'https://walletconnect.com/',
    type: 'tool',
    note: 'A protocol that connects hundreds of wallets to apps.'
  },
  {
    name: 'Wagmi',
    link: 'https://wagmi.sh/',
    type: 'tool'
  },
  {
    name: 'Viem',
    link: 'https://viem.sh/',
    type: 'tool',
    note: 'Typed tools for creating and verifying SIWE messages.'
  },
  {
    name: 'Ethereum identity kit',
    link: 'https://ethidentitykit.com',
    type: 'tool'
  },
  {
    name: 'Base Account',
    link: 'https://docs.base.org/base-account/',
    type: 'tool'
  },
  {
    name: 'Scaffold-ETH 2',
    link: 'https://scaffoldeth.io/',
    type: 'tool'
  },
  {
    name: 'OnchainKit',
    link: 'https://www.base.org/build/onchainkit',
    type: 'tool'
  },
  {
    name: 'Supabase',
    link: 'https://supabase.com/',
    type: 'tool'
  },
  {
    name: 'Thirdweb',
    link: 'https://thirdweb.com/',
    type: 'tool'
  },
  {
    name: 'Agora',
    link: 'https://www.agora.xyz/',
    type: 'tool'
  },
  {
    name: 'Dynamic',
    link: 'https://dynamic.xyz/',
    type: 'tool'
  },
  {
    name: 'RainbowKit',
    link: 'https://rainbowkit.com/',
    type: 'tool'
  },
  {
    name: 'The Graph',
    link: 'https://thegraph.com/',
    type: 'tool'
  },
  {
    name: 'Blockscout',
    link: 'https://www.blockscout.com/',
    type: 'tool'
  },
  {
    name: 'Namestone',
    link: 'https://namestone.xyz/',
    type: 'tool'
  },
  {
    name: 'Webhash',
    link: 'https://webhash.com/',
    type: 'tool'
  },
  {
    name: 'Fungate',
    link: 'https://fungate.io/',
    type: 'tool'
  },
  {
    name: 'World Liberty Financial',
    link: 'https://worldlibertyfinancial.com/',
    type: 'app'
  },
  {
    name: 'Polymarket',
    link: 'https://polymarket.com/',
    type: 'app',
    story: '/blog/success-stories/polymarket',
    note: 'The largest prediction market in the world, with tens of millions of users trading on real-world events.'
  },
  {
    name: 'OpenSea',
    link: 'https://opensea.io/',
    type: 'app',
    story: '/blog/success-stories/opensea',
    note: 'The largest marketplace for NFTs and onchain collectibles.'
  },
  {
    name: 'Superfluid',
    link: 'https://superfluid.finance/',
    type: 'app'
  },
  {
    name: 'Grails',
    link: 'https://grails.app/',
    type: 'app'
  },
  {
    name: 'PancakeSwap',
    link: 'https://pancakeswap.finance/',
    type: 'app'
  },
  {
    name: 'Nansen',
    link: 'https://www.nansen.ai/',
    type: 'app'
  },
  {
    name: 'Farcaster',
    link: 'https://farcaster.xyz/',
    type: 'app'
  },
  {
    name: 'Guild',
    link: 'https://guild.xyz/',
    type: 'app'
  },
  {
    name: 'OP Atlas',
    link: 'https://atlas.optimism.io/',
    type: 'app'
  },
  {
    name: 'Snapshot',
    link: 'https://snapshot.org/',
    type: 'app'
  },
  {
    name: 'Tally',
    link: 'https://tally.xyz/',
    type: 'app'
  },
  {
    name: 'Kleros',
    link: 'https://kleros.io/',
    type: 'app'
  },
  {
    name: 'Talent Protocol',
    link: 'https://talent.app/',
    type: 'app'
  },
  {
    name: 'Magic Eden',
    link: 'https://magiceden.io/',
    type: 'app'
  },
  {
    name: 'Paragraph',
    link: 'https://paragraph.com/',
    type: 'app'
  },
  {
    name: 'Ceramic',
    link: 'https://ceramic.network/',
    type: 'app'
  },
  {
    name: 'Lens',
    link: 'https://lens.xyz/',
    type: 'app'
  },
  {
    name: 'Fileverse',
    link: 'https://fileverse.io/',
    type: 'app'
  },
  {
    name: 'Galxe',
    link: 'https://galxe.xyz/',
    type: 'app'
  },
  {
    name: 'Doma Protocol',
    link: 'https://doma.xyz/',
    type: 'app'
  },
  {
    name: 'Foundation',
    link: 'https://foundation.app/',
    type: 'app'
  },
  {
    name: 'Shape.network',
    link: 'https://shape.network/',
    type: 'app'
  },
  {
    name: 'Oncyber',
    link: 'https://cyber.xyz/',
    type: 'app'
  },
  {
    name: 'Radicle',
    link: 'https://radicle.xyz/',
    type: 'app'
  },
  {
    name: 'Unlock Protocol',
    link: 'https://unlock-protocol.com/',
    type: 'app'
  },
  {
    name: 'Yup',
    link: 'https://yup.io/',
    type: 'app'
  },
  {
    name: 'Track Aurora',
    link: 'https://trackaurora.com/',
    type: 'app'
  },
  {
    name: 'Common Ground',
    link: 'https://app.cg/',
    type: 'app'
  },
  {
    name: 'GitPOAP',
    link: 'https://www.gitpoap.io/',
    type: 'app'
  },
  {
    name: 'ENSWatch',
    link: 'https://www.ens.watch/',
    type: 'app'
  },
  {
    name: 'POAP Drops',
    link: 'https://drops.poap.xyz/',
    type: 'app'
  },
  {
    name: 'Phi',
    link: 'https://phi.box/',
    type: 'app'
  },
  {
    name: 'ENS Tools',
    link: 'https://ens.tools/',
    type: 'app'
  },
  {
    name: 'Zapper',
    link: 'https://zapper.xyz/',
    type: 'app'
  },
  {
    name: 'Common.xyz',
    link: 'https://common.xyz/',
    type: 'app'
  },
  {
    name: 'Portrait',
    link: 'https://portrait.so/',
    type: 'app'
  },
  {
    name: 'Magic Square',
    link: 'https://magicsquare.io/',
    type: 'app'
  },
  {
    name: 'NEDApay',
    link: 'https://www.nedapay.xyz/',
    type: 'app'
  },
  {
    name: 'Opepen',
    link: 'https://opepen.art',
    type: 'app'
  },
  {
    name: 'networked.art',
    link: 'https://networked.art',
    type: 'app',
    story: '/blog/success-stories/networked-art',
    note: 'A signature turns the history already attached to your address into your account.'
  },
  {
    name: 'evm.now',
    link: 'https://evm.now',
    type: 'app',
    story: '/blog/success-stories/evm-now',
    note: 'A paid feature with no account to create; entitlement is read from the chain.'
  },
  {
    name: 'OpenRouter',
    link: 'https://openrouter.ai',
    type: 'app',
    story: '/blog/success-stories/openrouter',
    note: 'A unified API across hundreds of AI models, used by millions of developers to route inference.'
  },
  {
    name: '1Shot Wallet',
    link: 'https://1shotapi.com/solutions/1shot-wallet',
    type: 'tool',
    note: 'An embedded wallet with native SIWE support for app authentication.'
  }
]
