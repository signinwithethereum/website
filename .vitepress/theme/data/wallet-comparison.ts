import { EXAMPLE } from "../lib/example.ts";

export type Step = "idle" | "review" | "signing" | "done";

export const SHORT_ADDRESS = `${EXAMPLE.address.slice(0, 6)}…${EXAMPLE.address.slice(-4)}`;

/* A 32-byte challenge, which is what login looked like before the standard:
 * the server hands out random bytes and asks for a signature over them. There
 * is nothing in here for a wallet to render, and nothing binding it to a site.
 * It stays local rather than joining `example.ts` — it is the anti-example,
 * and the validator has no business importing a deliberately bad payload. */
export const CHALLENGE =
  "0x4a8f2c17b0d95e3f6c81aa47d2e05b9317fc6a8e4b23d70f95c18ae62d4b0f3a";

const CHAIN_NAMES: Record<string, string> = { "1": "Ethereum" };

/* The rows a wallet can draw once it has parsed the message. Every value is
 * read off the same example the validator uses, so the phone cannot end up
 * describing a different message than the one the site documents. */
export const ROWS = [
  { label: "Site", value: EXAMPLE.domain, check: "matches this page" },
  { label: "Account", value: SHORT_ADDRESS },
  {
    label: "Network",
    value: CHAIN_NAMES[EXAMPLE.chainId] ?? `Chain ${EXAMPLE.chainId}`,
  },
  {
    label: "Expires",
    value: `in ${Math.round(
      (Date.parse(EXAMPLE.expirationTime) - Date.parse(EXAMPLE.issuedAt)) /
        60_000,
    )} minutes`,
  },
];

export const LANES = [
  {
    id: "adhoc",
    tone: "tone-no",
    mark: "✕",
    verdict: "No standard",
    cta: "Sign In",
    sheetTitle: "Signature request",
    reject: "Reject",
    sign: "Sign",
    captions: {
      idle: "Without a standard, the app asks for a signature over some random bytes.",
      review:
        "The wallet has no format to interpret, so it falls back to raw bytes and a generic warning that leaves the intent hidden.",
      signing:
        "Signing bytes whose meaning nothing on this screen can explain.",
      done: "Signed in, with no way of knowing what was actually agreed to.",
    },
  },
  {
    id: "siwe",
    tone: "tone-yes",
    mark: "✓",
    verdict: "With SIWE",
    cta: "Sign in with Ethereum",
    sheetTitle: "Sign In",
    reject: "Cancel",
    sign: "Sign in",
    captions: {
      idle: "With SIWE, the app builds a message in a format wallets already know how to read.",
      review:
        "With SIWE, wallets and apps can display easy to understand, secure signing interfaces that make the intent clear.",
      signing:
        "The bytes being signed are exactly the text that was on screen.",
      done: "Signed in, knowing which site was authorised and for how long.",
    },
  },
] as const;

export type Lane = (typeof LANES)[number]["id"];

export const MARKERS: { step: Step; label: string }[] = [
  { step: "idle", label: "Start" },
  { step: "review", label: "Review" },
  { step: "done", label: "Signed" },
];

export const NOTES: Record<Step, string> = {
  idle: "Same account, same signing call. Press sign in on either phone.",
  review:
    "This is everything the person has to decide from. Press sign on either phone.",
  signing: "Both wallets sign the exact bytes they were handed.",
  done: "Identical cryptography. Two very different things a person saw.",
};
