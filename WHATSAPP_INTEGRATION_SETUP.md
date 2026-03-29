# WhatsApp Business API Integration - Setup Guide

## Overview

This guide walks you through setting up the WhatsApp Business API integration for Turquoise CRM. The system allows you to:

- **Receive messages** from WhatsApp clients
- **Auto-detect** if customer already exists in the system
- **Prompt lead creation** for new customers with confirmation UI
- **Respond** directly from the CRM using quick replies or custom messages
- **Track conversations** with full message history

## Architecture Flow

```
WhatsApp Client → WhatsApp Business API
                  ↓
        Webhook Handler (/api/webhooks/whatsapp)
                  ↓
        Parse & Extract Message Data
                  ↓
        Search for Existing Customer
                  ├─ Found in "leads" → Attach to existing lead
                  ├─ Found in "client_files" → Attach to existing file
                  └─ Not found → Store message & prompt for lead creation
                  ↓
        Store Message in Database
                  ↓
        Update/Create Conversation Thread
                  ↓
        Notify CRM Dashboard (Real-time via Supabase)
                  ↓
        Agent Opens WhatsApp Inbox
                  ├─ View conversation history
                  ├─ Click quick reply template
                  └─ Send custom message
                  ↓
        Send Response via WhatsApp API
                  ↓
        Store Outbound Message in Database
```

## Step 1: Setup WhatsApp Business Account

### 1.1 Create Facebook Business Account
1. Go to [business.facebook.com](https://business.facebook.com)
2. Create a Business Account or use existing one
3. Verify your business information

### 1.2 Setup WhatsApp Business App
1. Go to [WhatsApp Business Dashboard](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
2. Create a Business App or use existing one
3. Add WhatsApp product to your app
4. In Settings → Basic, note your:
   - **App ID**
   - **App Secret**

### 1.3 Create/Register Phone Number
1. Go to WhatsApp Business Dashboard → Phone Numbers
2. Register a business phone number or verify existing one
3. Get your **Phone Number ID** (looks like: `102xxxxxxxxxxxx`)
4. Verify your phone number via SMS/call

## Step 2: Generate API Access Token

1. Go to WhatsApp Business Dashboard → API Setup
2. Create a **System User** (Settings → Users → System Users)
3. Assign permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
4. Generate a **Long-Lived Access Token**
   - This token expires in ~60 days (you'll need to refresh periodically)
5. Copy this token - you'll need it for `.env.local`

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```env
# WhatsApp Business API
WHATSAPP_API_TOKEN=your-access-token-here
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id-here
WHATSAPP_VERIFY_TOKEN=your-custom-verify-token-here  # Create any random string

# Also needed for webhook handler
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 4: Database Migration

The database tables are created via migration:
- **File**: `supabase/migrations/010_whatsapp_integration.sql`

To apply the migration:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Manually in Supabase console
# Copy-paste the SQL from 010_whatsapp_integration.sql
```

This creates:
1. **whatsapp_messages** - All incoming/outgoing messages
2. **whatsapp_conversations** - Conversation threads
3. **whatsapp_response_templates** - Quick reply templates

## Step 5: Setup Webhook

### 5.1 Configure in WhatsApp Dashboard

1. Go to WhatsApp Business Dashboard → Configuration
2. Under "Webhooks", add your webhook endpoint:
   - **Webhook URL**: `https://your-domain.com/api/webhooks/whatsapp`
   - **Verify Token**: Use the `WHATSAPP_VERIFY_TOKEN` from Step 3
3. Subscribe to these webhook fields:
   - `messages` (for incoming messages)
   - `message_status` (for delivery receipts)

### 5.2 Test Webhook

Once configured, send a test message from any WhatsApp account to your business number. You should see:

1. **In server logs**: `[WhatsApp] Received message from 33612345678: ...`
2. **In database**: New row in `whatsapp_messages` table
3. **In CRM**: New entry in WhatsApp Inbox (if customer not found)

## Step 6: Access WhatsApp Inbox

Navigate to: **Dashboard → Messages WhatsApp**

### Features Available:
- **Left Panel**: List of all active conversations with unread count
- **Center Panel**: Full message history for selected conversation
- **Bottom Panel**: Quick reply templates (click to insert)
- **Send Button**: Send custom message via WhatsApp API

### Lead Creation Flow

When a message arrives from an unknown number:

1. Message is stored in database with status "new_customer"
2. **CRM shows notification**: "New WhatsApp conversation - Create lead?"
3. Agent clicks confirmation
4. **New lead is created** with:
   - `phone`: from WhatsApp message
   - `first_name`, `last_name`: from WhatsApp profile (if available)
   - `source`: "whatsapp"
   - `status`: "nouveau"
5. Message is automatically linked to the new lead

## File Structure

```
app/
  api/
    webhooks/
      whatsapp/
        route.ts          ← Webhook handler (POST & GET)
    whatsapp/
      send/
        route.ts          ← Send message endpoint
  (dashboard)/
    dashboard/
      whatsapp/
        page.tsx          ← Inbox page

components/
  whatsapp-inbox.tsx     ← Main UI component

lib/
  services/
    whatsapp.service.ts  ← Business logic & API calls

supabase/
  migrations/
    010_whatsapp_integration.sql  ← Database schema
```

## Key Functions

### In `lib/services/whatsapp.service.ts`:

- **sendWhatsAppMessage()** - Send text message to customer
- **getResponseTemplates()** - Fetch quick reply templates
- **getConversationHistory()** - Get all messages for a phone number
- **getActiveConversations()** - Get all conversations
- **markConversationAsRead()** - Clear unread count

### In `app/api/webhooks/whatsapp/route.ts`:

- **POST** - Receive messages from WhatsApp (called by webhook)
- **GET** - Verify webhook (called by WhatsApp during setup)

## Testing Locally

### 1. With Mock Data

```typescript
// Test in browser console or test file
const response = await fetch('/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '33612345678',
    message: 'Test message',
    leadId: 'lead-uuid-here'
  })
});
```

### 2. With Real WhatsApp Number

Send a message to your business WhatsApp number. Check:
1. Server logs for `[WhatsApp]` messages
2. Supabase `whatsapp_messages` table for new rows
3. CRM dashboard for new conversation

## Troubleshooting

### Webhook not receiving messages

**Check:**
1. Webhook URL is correct and accessible from internet
2. Verify token matches in `.env.local` and WhatsApp Dashboard
3. Phone number is verified in WhatsApp Business Dashboard
4. Check server logs for POST requests to `/api/webhooks/whatsapp`

**Test:**
```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "messages": [{
            "id": "test123",
            "from": "33612345678",
            "type": "text",
            "text": { "body": "Test message" }
          }],
          "contacts": [{
            "wa_id": "33612345678",
            "profile": { "name": "Test User" }
          }]
        }
      }]
    }]
  }'
```

### Messages not sending

**Check:**
1. `WHATSAPP_API_TOKEN` is valid and not expired
2. `WHATSAPP_PHONE_NUMBER_ID` is correct
3. Phone number is verified in WhatsApp Dashboard
4. Recipient number is in correct format (country code + number, no +)
5. Check Supabase `whatsapp_messages` table - should have outbound row

**Token Expiration:**
- Long-lived tokens expire ~60 days
- Generate a new token in WhatsApp Business Dashboard
- Update `.env.local` with new token

### "Could not find column in schema"

This is already fixed in the current implementation via dynamic schema detection. If you see this error:
1. Check database migration was applied: `supabase db list`
2. Verify `whatsapp_messages` table exists in Supabase
3. Check column names match exactly (case-sensitive)

## Next Steps

1. ✅ Setup WhatsApp Business Account & API Token
2. ✅ Configure environment variables
3. ✅ Apply database migration
4. ✅ Setup webhook in WhatsApp Dashboard
5. ✅ Test with real WhatsApp messages
6. 🔄 **Your turn**: Customize quick reply templates
7. 🔄 Integrate lead creation confirmation UI
8. 🔄 Add message notifications to dashboard header

## Advanced: Custom Templates

To add custom response templates, insert directly in Supabase:

```sql
INSERT INTO whatsapp_response_templates (name, content, category, description) 
VALUES 
  ('thanks', 'Merci pour votre message! Nous revenons vers vous rapidement.', 'greeting', 'Default reply'),
  ('pricing', 'Pour les tarifs, consultez notre site: example.com', 'general', 'Pricing info');
```

Or create a settings panel in the CRM to manage templates without SQL.

## Questions?

This integration is ready for your team to test. Let me know:
- Any issues during setup?
- Missing features you need?
- Questions about the flow?
