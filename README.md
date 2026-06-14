This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Private Ops Console

BringhurstDO Ops is a private, metadata-only operator console for local/mock
planning. Do not connect AI APIs, social APIs, AWS credentials, GA4, Meta, or
Vercel tokens until explicitly approved.

Required local environment variables are listed in `.env.example`:

- `OPS_BASIC_AUTH_USERNAME`
- `OPS_BASIC_AUTH_PASSWORD_SHA256`
- `CRON_SECRET`

`CRON_SECRET` secures the Phase 8C autopublish cron route (`/api/cron/ops-autopublish`).
Set `OPS_AUTOPUBLISH_ENABLED=true` only with database storage, LinkedIn configured,
and `CRON_SECRET` in Vercel project settings.

### Generate the Ops Password Hash

Use this safer PowerShell prompt so the password is not typed directly into the
command line:

```powershell
$password = Read-Host -AsSecureString "Ops password"
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $bytes = [Text.Encoding]::UTF8.GetBytes($plain)
  $hash = [Security.Cryptography.SHA256]::HashData($bytes)
  -join ($hash | ForEach-Object { $_.ToString("x2") })
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
```

Set the printed value as `OPS_BASIC_AUTH_PASSWORD_SHA256`.

The Node one-liner is less safe because it exposes the password in shell history:

```powershell
node -e "const crypto=require('crypto'); const p=process.argv[1]; console.log(crypto.createHash('sha256').update(p,'utf8').digest('hex'))" "your-password-here"
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
