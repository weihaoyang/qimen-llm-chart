# Linked Web SDK Build Bootstrap

## Contract

The Qimen product consumes `@singularity-sequence/web-sdk` through the existing local `file:` dependency. Its package entry points are `dist/index.js` and `dist/index.d.ts`; a fresh linked checkout may have source files but no `dist/` directory. The product build helper compiles a temporary copy of that SDK, makes the compiled package available through Qimen-only temporary aliases, then runs the normal Next.js webpack build without mutating the installed link or SDK source checkout.

The helper now treats the installed `node_modules/@singularity-sequence/web-sdk` junction as read-only: it checks its target, copies source into an OS temporary directory, and compiles there. It then copies the compiled package into a Qimen-owned temporary directory and supplies temporary TypeScript and webpack aliases for the build. Cleanup is guarded to remove only the two ordinary temporary directories created by the helper. Next build output remains in the separate Qimen-owned `.next-qimen-sdk-validation` directory for this verification run.

## Verification

- SDK source: the read-only Consumer Platform checkout at `consumer-platform-readonly` (`c602dd1`). Its four SDK package files matched the junction target byte-for-byte before and after the build attempt.
- `node --check ops/build-linked-web-sdk.mjs` passed; `git diff --check` passed.
- The first isolated build compiled the SDK, then exposed a broken temporary `@/` path alias in the Next webpack phase. The helper was corrected to use the absolute Qimen base path and an explicit webpack `@` alias.
- The second isolated build compiled the SDK and loaded `next.config.ts`, then stopped with `ENOSPC` while writing `.next-qimen-sdk-validation`. At that point the E: volume had 258,048 bytes free. The partial output was left in place. The Next build did not pass, so no route smoke was claimed.
- No Consumer Platform checkout was written, deployed, or pushed. The existing install junction was not renamed, removed, or written through.
