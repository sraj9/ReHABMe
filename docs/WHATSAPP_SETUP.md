# WhatsApp Business Cloud API Setup

Staff invites and password resets are sent as WhatsApp messages from your clinic's
number. This requires Meta's **WhatsApp Business Platform (Cloud API)** — a different
thing from the WhatsApp Business *app* on your phone.

> ⚠️ **Important:** a phone number can be connected to the app **or** the API, not both.
> Recommended: keep your main clinic number in the phone app, and use a **second number**
> (any SIM that can receive one verification SMS/call) for the API.

## 1. Create the Meta app

1. Go to [business.facebook.com](https://business.facebook.com) and make sure you have a
   Meta Business Portfolio (create one if prompted).
2. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**.
   - Use case: **Other** → Type: **Business** → link your business portfolio.
3. On the app dashboard, find **WhatsApp** and click **Set up**.

## 2. Add your phone number

1. In the app: **WhatsApp → API Setup**.
2. Meta gives you a free **test number** immediately — you can use it to try everything
   (it can only message up to 5 pre-verified recipients).
3. For real use, click **Add phone number**: enter the second number, verify it by
   SMS/call, and set the display name (e.g. "ReHABMe Physiotherapy").
4. Copy the **Phone number ID** shown on the API Setup page — you'll paste this into
   ReHABMe → Settings → WhatsApp. (It's a long numeric ID, not the phone number.)

## 3. Create a permanent access token

The token shown on the API Setup page expires in 24 hours. For a permanent one:

1. business.facebook.com → **Settings → Users → System users → Add**.
   - Name: `rehabme-crm`, role: **Admin**.
2. Open the system user → **Add assets** → Apps → select your app → **Full control**.
3. Click **Generate new token** → select your app → token expiration **Never** →
   check permissions **whatsapp_business_messaging** and **whatsapp_business_management** →
   Generate.
4. Copy the token (starts with `EAA…`) — paste it into ReHABMe → Settings → WhatsApp.
   It is stored in the database readable only by admins and used only server-side.

## 4. Create the message template

Business-initiated WhatsApp messages must use a pre-approved template.

1. Go to [business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates)
   (or Meta app → WhatsApp Manager → Message templates) → **Create template**.
2. Category: **Utility**. Name: `staff_invite` (must match the template name in
   ReHABMe Settings). Language: **English**.
3. Body — must have exactly 4 variables:

   ```
   Hello {{1}}, your ReHABMe CRM staff account is ready.

   Login: {{2}}
   Temporary password: {{3}}

   Sign in at {{4}} — you'll be asked to set your own password on first login.
   ```

4. Add sample values when prompted (e.g. `Dr. Priya`, `+919876543210`, `Xk3mP9qR2t`,
   `https://rehabme.vercel.app`) and submit. Approval is usually minutes to a few hours.

## 5. Connect it in ReHABMe

1. Log in to ReHABMe as an admin → **Settings → WhatsApp**.
2. Paste the **Phone Number ID** and the **permanent access token**; template name
   `staff_invite`. Save.
3. Use **Send a test message** with your own WhatsApp number. (If using Meta's test
   number, your number must first be added as a recipient on the API Setup page.)
4. Once the test arrives, staff invites from **Settings → Staff Management** will
   deliver credentials automatically. If a send ever fails, the app still shows the
   temporary password on screen so you can share it manually.

## Costs

Meta's utility conversations have a per-conversation price (in India roughly ₹0.12–0.35)
after the free tier; at a clinic's invite/reset volume this is effectively negligible.
