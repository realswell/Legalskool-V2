# LegalSkool

Court-safe notes and the AI Vakeel masterclass. The site is a Vite + React app. Cloudflare Worker `legalskool-v2` serves the built files and the payment, Campus, and admin APIs.

Do not merge to `main` until the secrets in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) are set. A merge auto-deploys. Do not change `legalskool.store` DNS from this change.

`npm test` checks order amounts and Razorpay signatures with stubbed secrets. `npm run build` typechecks and builds `dist/`.
