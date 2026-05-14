# 💱 Currency Management - Quick Reference

## 🎯 What It Does

Admins can now choose how exchange rates are calculated for each currency pair:

1. **🔄 Automatic Mode** - System fetches live rates from the internet
2. **✋ Manual Mode** - Admin sets the rate manually

Perfect for global transactions - automatic mode works worldwide, manual mode gives you control.

---

## 🚀 Quick Start

### 1. Access Admin Panel
```
http://localhost:3000/admin/currencies
```

### 2. Manage Currency Pair (e.g., RWF → GHS)

#### Switch to Automatic Mode
- Click "🔄 Automatic" button
- System fetches live rate
- Shows live rate, last updated time
- Falls back to last known rate if API fails

#### Switch to Manual Mode
- Click "✋ Manual" button
- Click "✏️ Edit"
- Enter exchange rate (e.g., 1.25)
- Set spread/margin (e.g., 2.5% = 0.025)
- Click "Save"

#### Adjust Spread (Profit Margin)
- Both modes support spread adjustment
- Higher spread = higher profit margin
- Applied to both automatic and manual rates
- Formula: `Client Rate = Mid Rate × (1 - Spread)`

#### Deactivate Currency
- Click toggle switch to disable
- Transfers using this pair will fail
- Re-enable anytime

---

## 🔧 Backend API

### Get All Currencies
```bash
curl http://localhost:3001/api/v1/admin/currencies \
  -H "Authorization: Bearer TOKEN"
```

Response:
```json
{
  "currencies": [
    {
      "corridor": "RWF_GHS",
      "mode": "AUTOMATIC",
      "manualRate": null,
      "spread": 0.025,
      "isActive": true,
      "lastRate": 1.24,
      "forexRate": {
        "midRate": 1.24,
        "clientRate": 1.2084,
        "fetchedAt": "2026-05-12T10:00:00Z"
      }
    }
  ]
}
```

### Set Manual Rate
```bash
curl -X POST http://localhost:3001/api/v1/admin/currencies/RWF_GHS/manual-rate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "manualRate": 1.25,
    "spread": 0.025
  }'
```

### Enable Automatic Mode
```bash
curl -X POST http://localhost:3001/api/v1/admin/currencies/RWF_GHS/automatic-mode \
  -H "Authorization: Bearer TOKEN"
```

### Update Spread
```bash
curl -X PUT http://localhost:3001/api/v1/admin/currencies/RWF_GHS/spread \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spread": 0.03
  }'
```

### Toggle Currency Status
```bash
curl -X PUT http://localhost:3001/api/v1/admin/currencies/RWF_GHS/status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

---

## 📊 Understanding the Data

### Currency Pair Example: RWF → GHS

```
Corridor:     RWF_GHS
Mode:         MANUAL
Manual Rate:  1.25
Spread:       0.025 (2.5%)

Calculation:
├─ Mid Rate (Source):    1.25
├─ Spread:               2.5%
└─ Client Rate (User):   1.2188 (1.25 × 0.975)

User transfers 100 RWF → Gets 121.88 GHS
(We keep 1.25 × 2.5% = 0.03125 as profit/commission)
```

### Automatic Mode Example

```
Corridor:        RWF_GHS
Mode:            AUTOMATIC
Last Known Rate: 1.24 (cached fallback)
Spread:          0.025

Live Fetch:
├─ API Response: 1.249
├─ Client Rate:  1.2178 (1.249 × 0.975)
└─ Updated:      Just now

If API fails:
├─ Use Last Rate: 1.24
└─ Client Rate:   1.209
```

---

## 🔗 Database Tables

### CurrencySetting Table
```sql
SELECT * FROM CurrencySetting WHERE corridor = 'RWF_GHS';

-- Output:
id              | 1
corridor        | RWF_GHS
mode            | AUTOMATIC
manualRate      | NULL
spread          | 0.025
isActive        | true
lastRate        | 1.24
lastFetchedAt   | 2026-05-12 10:00:00
autoFallbackRate| 1.24
createdAt       | 2026-05-01 09:00:00
updatedAt       | 2026-05-12 10:00:00
```

### ForexRate Table (Updated)
```sql
SELECT * FROM ForexRate WHERE corridor = 'RWF_GHS' ORDER BY fetchedAt DESC LIMIT 1;

-- Output:
id              | abc-123
corridor        | RWF_GHS
fromCcy         | RWF
toCcy           | GHS
midRate         | 1.249
spreadPct       | 0.025
clientRate      | 1.2178
fetchedAt       | 2026-05-12 10:00:00
isStale         | false
setByAdmin      | false
createdAt       | 2026-05-12 10:00:00
```

---

## 🛠️ Configuration

### Environment Variable for API Key

Add to `.env`:
```
# For automatic rate fetching
# Sign up free at: https://www.exchangerate-api.com/
# Free tier: 1,500 requests/month
FOREX_API_KEY=your_api_key_here
```

### Which Exchange Rate API?

Currently configured for **exchangerate-api.com**:
- ✅ Free tier available
- ✅ 1,500 requests/month
- ✅ Accurate rates
- ✅ Multiple currency support
- ✅ No credit card required

To use different API, modify `fetchLiveRate()` in `services/core/src/services/currencyService.js`

---

## 📋 Workflow Example

### Scenario: You're a Platform in Rwanda Sending Money to Ghana

1. **Day 1 - Initial Setup**
   ```
   Admin Panel → Currencies → RWF_GHS
   Select: Automatic Mode
   System fetches current rate: 1.24
   Set spread: 2.5% (your profit margin)
   ```

2. **Day 2 - Worldwide Sales**
   ```
   User transfers: 100 RWF
   Rate used: 1.24 (last fetched)
   Spread applied: 2.5%
   User receives: ~121.88 GHS
   Your profit: 0.03125 × 100 RWF worth
   ```

3. **Day 3 - Market Changes**
   ```
   New global rate: 1.20 (market moved down)
   Admin notices automatic mode
   System already updated to 1.20
   New transfers use 1.20 rate
   More competitive pricing ✓
   ```

4. **Day 4 - Fix Rate Decision**
   ```
   Market unstable, admin decides to lock rate
   Admin Panel → Switch to Manual Mode
   Set rate to: 1.22 (good middle ground)
   All transfers use 1.22
   Predictable, stable pricing ✓
   ```

---

## ⚠️ Important Notes

1. **Automatic Mode Needs API Key**
   - Free tier available
   - Add `FOREX_API_KEY` to `.env`
   - Fallback uses last rate if API fails

2. **Spread is Mandatory**
   - Minimum: 0% (no profit)
   - Maximum: 100% (2x markup)
   - Default: 2.5% (reasonable)

3. **Rates Are Locked at Transfer**
   - Rate when user initiates transfer is locked
   - Won't change if rate updates mid-transfer
   - Ensures user knows exact amount

4. **Audit Trail**
   - All rate changes logged
   - Admin actions tracked
   - See who changed what and when

5. **Inactive Currency Pairs**
   - Deactivating prevents new transfers
   - Existing transfers continue
   - Re-enable to accept transfers again

---

## 🆘 Troubleshooting

### Automatic Mode Not Updating
```
✓ Check FOREX_API_KEY is set
✓ Verify API rate limit not exceeded
✓ Check internet connection
✓ System uses fallback (last rate) if API fails
```

### Manual Rate Saved but Not Used
```
✓ Confirm currency pair is Active
✓ Check spread is set correctly
✓ Verify corridor name (e.g., RWF_GHS)
✓ New transfers use new rate
```

### Rate Calculation Wrong
```
Formula: Client Rate = Mid Rate × (1 - Spread)

Example:
  Mid Rate: 1.25
  Spread: 0.025 (2.5%)
  Client Rate: 1.25 × (1 - 0.025) = 1.25 × 0.975 = 1.2188

If different:
✓ Verify spread value (0.025 = 2.5%, not 25%)
✓ Check rounding (6 decimals max)
```

---

## 📞 Need Help?

1. Check logs: `npm run logs:core`
2. Verify currency exists: `curl http://localhost:3001/api/v1/admin/currencies`
3. Check health: `curl http://localhost:3001/healthz`
4. See API docs: `SETUP_AND_DEPLOYMENT.md`

---

**Happy currency management! 💱**
