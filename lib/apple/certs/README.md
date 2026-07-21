# Apple root certificate

`lib/apple/verifyTransaction.ts` needs Apple's public root certificate here
to verify that a purchase receipt really came from Apple. This is a public
file (not a secret) — download it once and commit it:

1. Go to https://www.apple.com/certificateauthority/
2. Under **Apple Root Certificates**, download **Apple Root CA - G3**
3. Save it as `AppleRootCA-G3.cer` in this folder (`lib/apple/certs/`)
4. `git add lib/apple/certs/AppleRootCA-G3.cer` and commit

That's it — no server restart needed beyond a normal deploy. See
`docs/ios-storekit-setup.md` for the rest of the IAP setup.
