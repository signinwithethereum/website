---
title: Message builder
description: Assemble an ERC-4361 message field by field and watch the wire format change. Generates nonces and timestamps. Runs entirely in your browser.
pageClass: wide
outline: false
aside: false
agentSummary: |
  ## Using the interactive builder

  Enter the domain, Ethereum address, URI, chain ID, nonce and issued-at timestamp.
  Statement, expiration time, not-before time, request ID and resources are optional.
  Version is fixed at `1`. The builder assembles a plain-text ERC-4361 message as
  fields change, reports field errors or warnings, and lets you copy the output.
  It runs entirely in the browser; it does not sign the message or start a session.

  On opening the interactive page, the builder generates a fresh nonce, sets
  Issued At to the current time, and sets Expiration Time ten minutes later.
  The static example records the server-rendered defaults, before those browser
  updates. Its field check omits the validator's security and best-practice checks.
  A well-formed result does not verify a signature, server-issued nonce, allowed
  domain or URI, or session policy. Use the server-side verification flow in the
  [quickstart](/docs/quickstart/) for authentication.
---

# Message builder

Fill in fields on the left, read the message on the right. Useful for seeing
what a field actually does to the wire format, and for producing a fixture to
paste into a test.

<Builder />

## Notes

The nonce button uses `crypto.getRandomValues`, which is the right source. In
production the nonce must come from **your server** and be accepted exactly once;
a nonce the client picked is not a nonce, it is a decoration.

`Version` is always `1`, so it is not editable. Leaving `Expiration Time` empty
is legal and usually a mistake; ten minutes is a reasonable default, because this
timestamp bounds the sign-in, not the session that follows it.

Resources go one URI per line. If you are reaching for them to express
permissions rather than to show the user a list, read
[ERC-5573](https://eips.ethereum.org/EIPS/eip-5573) first.
