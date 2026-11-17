# Khatabar

The front-desk register for an Indian neighbourhood gym, drawn the way the gym already looks: a rolled steel shutter, a ruled register, bumper-plate colours, a whiteboard with magnets and a laminated member card.

Live: https://khatabar.vercel.app (the demo gym, Lohapuri Iron Gym, runs in your browser with made-up members, so you can try everything without signing up).

## What it does

**At the desk (fast, keyboard first)**
- Raise the shutter to open the shift. Type the last 4 digits of a phone, or scan the member's QR, and the member's card lifts out of the register.
- `R` renew, `1`-`6` pick a plan, `P` UPI, `Shift+P` cash, `Shift+S` split, `D` discount (above 10% needs a manager PIN), `C` check in, `F` freeze, `W` WhatsApp receipt, `Ctrl+Z` undo, `?` for every key.
- Old dues ride on a renewal by default, so the card is stamped PAID only when nothing is left. A part payment is stamped PART PAID with the same balance the card shows.
- Queue Mode keeps the caret in the search box, so the desk can take one member after another without touching the mouse.
- Today's page lists every counter line with the cash and UPI totals; closing the shift counts the drawer against it.

**Dues rack**
- Members who end soon, are due or have lapsed hang on the rack as plates. Load them onto the bar and walk the queue: each one opens a WhatsApp chat with the reminder already written (free click-to-chat, no paid API). The bar shows what is asked for renewals and what is already owed.

**Whiteboard**
- The next two weeks as a board of magnets, coloured by days left. Drag a magnet to freeze a member, approve or decline freeze requests, `E` erases.

**Owner slate**
- Yesterday's takings by mode, UPI still waiting to be matched, who is drifting away, and the drawer gaps, on one page of the register.

**Member card (phone first)**
- Each member gets a private link: a locker that opens on their card with a rotating QR for the desk, days left as a loaded barbell, a chalk tally of visits, renew by UPI (`upi://` link and QR), pause my plan with undo, receipts, and the whole page in English or Hindi.

**Bahi import**
- Drop in the Excel or CSV you already keep. The header row is found even under a title line, columns are matched by name, day-first dates are worked out from the sheet, and the amount still due becomes the member's balance. Payments from the old sheet are filed as opening balances, never as today's cash. Any import can be undone for 24 hours.

## Stack

- Next.js 16 (App Router) and React 19, with Motion for the springs
- Neon serverless Postgres, through `@neondatabase/serverless`
- Signed cookies for the owner, staff PINs and paired desk devices; every change is validated on the server and written through an idempotent op log
- Fonts from `next/font/google`, including Devanagari for the Hindi copy
- SheetJS and Papa Parse for import, ZXing for the camera scanner, `qrcode` for QR codes
- Hosted on Vercel, with a daily cron that builds the day's reminders and closes imports past their undo window

## Free setup

1. Create a free Neon project and copy the pooled connection string.
2. Copy `.env.example` to `.env.local` and fill in:
   - `DATABASE_URL`: the Neon connection string
   - `KB_SECRET`: 32 or more random characters
   - `CRON_SECRET`: any random string
3. Install and create the tables:
   ```bash
   pnpm install
   pnpm migrate
   ```
4. Run it: `pnpm build && pnpm start`, then open http://localhost:3720.
5. Deploy on Vercel Hobby: import the repo, add the same three variables, and deploy. `vercel.json` already sets the daily cron.

Without `DATABASE_URL` the API answers 503, but the demo gym still works, because it runs in the browser.

## How a gym starts

1. **Sign up** at `/start` with the gym's name, an email and a password.
2. **Set up the branch** on one page: the branch name, the gym's UPI ID, the plans and prices, and the staff with their 4-digit PINs.
3. **Pair the desk:** in Settings, show the pairing QR and open it on the desk computer or tablet (scan it, or type the link). Only paired devices can unlock the desk with a PIN.
4. **Bring the old register** through Bahi import, check the rows, and press Import.
5. **Raise the shutter** and start taking members. Send each member their card link from the desk on WhatsApp.
