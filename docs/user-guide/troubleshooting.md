# Troubleshooting

Solutions to common issues with Protocol Guide.

---

## Quick Fixes

**Before diving into specific issues, try these steps:**

1. **Refresh the app**: Pull down on the screen or tap the refresh icon
2. **Check your internet**: Ensure you have a stable connection
3. **Restart the app**: Close completely and reopen
4. **Clear cache**: Profile → Settings → Clear Cache
5. **Update the app**: Check for updates (PWA updates automatically)

---

## Search Issues

### "No results found"

**Possible causes and solutions:**

1. **Spelling errors**
   - Check medical term spelling
   - Try alternative terms (e.g., "epi" vs "epinephrine")

2. **Query too specific**
   - Broaden your search
   - Remove specific patient details

3. **Region not selected**
   - Go to Profile → Settings → Region
   - Select your county/state

4. **Offline without cached protocols**
   - Connect to internet
   - Or enable offline mode while connected

### "Results don't match my question"

1. **Be more specific**
   - Add patient demographics (adult/pediatric)
   - Include the specific condition
   - Mention the scenario type (field, transport)

2. **Rephrase the query**
   - Try asking in a different way
   - Use medical terminology

3. **Check your region**
   - Results are tailored to your selected region
   - Verify the correct region is selected

### "Search is slow"

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Always slow | Weak internet | Check connection, try Wi-Fi |
| First search slow | App loading | Wait, subsequent searches will be faster |
| Complex queries slow | AI processing | Normal for Sonnet queries (3-5 sec) |
| Offline search slow | Not cached | Download protocols for offline use |

---

## Voice Search Issues

### "Microphone not working"

**iPhone/iPad:**
1. Go to **Settings** → **Safari** (or browser app)
2. Find **Microphone**
3. Enable for protocol-guide.com

**Android:**
1. Go to **Settings** → **Apps** → **Chrome**
2. **Permissions** → **Microphone** → Allow

**Desktop:**
1. Click the microphone/lock icon in the address bar
2. Allow microphone access

### "Voice not being recognized"

1. **Speak clearly** at a normal pace
2. **Reduce background noise**
3. **Move closer** to the microphone
4. **Check microphone hardware** (try in another app)

### "Wrong transcription"

1. **Edit the transcription** before searching
2. **Pronounce medical terms** more carefully
3. **Spell out** uncommon terms if needed
4. **Use text search** as a fallback

### Voice search stops working suddenly

1. **Check internet connection** (required for transcription)
2. **Refresh the app**
3. **Check microphone permissions** again
4. **Restart your device**

---

## App Installation Issues

### "Can't add to home screen" (iPhone)

1. **Must use Safari** – Other browsers don't support PWA installation
2. Open protocol-guide.com in Safari
3. Tap Share (□↑) → "Add to Home Screen"

### "Install option not appearing" (Android)

1. Ensure you're using **Chrome**
2. Visit the site **multiple times** – Chrome learns usage patterns
3. Look for the **install prompt** at the bottom
4. Or use Menu (⋮) → "Add to Home screen"

### "App not updating"

PWAs update automatically. To force update:

1. **iPhone**: Clear Safari website data for protocol-guide.com
2. **Android**: Chrome → Settings → Site Settings → protocol-guide.com → Clear & Reset
3. **Desktop**: Clear browser cache

---

## Account & Sign-In Issues

### "Can't sign in"

1. **Check your internet connection**
2. **Try a different sign-in method** (Google vs Apple)
3. **Clear browser cookies** for protocol-guide.com
4. **Try incognito/private mode**

### "Sign-in keeps failing"

**Google sign-in:**
- Ensure pop-ups aren't blocked
- Check that third-party cookies are enabled
- Try signing into Google separately first

**Apple sign-in:**
- Works best on Safari (iPhone) or Apple devices
- Ensure you have an Apple ID with 2FA enabled

### "Signed out unexpectedly"

1. **Session expired** – normal after extended inactivity
2. **Cookies cleared** – browser or cleaning app removed session
3. **Sign in again** – your data is preserved

### "Account data missing"

1. **Confirm you signed in** with the same method (Google vs Apple)
2. **Check internet connection** – data syncs when online
3. **Contact support** if data is still missing: support@protocol-guide.com

---

## Subscription Issues

### "Pro features not working"

1. **Verify subscription status**: Profile → Subscription
2. **Check payment**: Ensure payment method is valid
3. **Restore purchase**:
   - Profile → Subscription → "Restore Purchases"
4. **Sign out and back in** to refresh status

### "Payment failed"

1. **Check card details** are correct
2. **Ensure sufficient funds**
3. **Try a different card**
4. **Contact your bank** if card is being declined
5. **Contact support**: support@protocol-guide.com

### "Charged but no Pro access"

1. **Wait 5 minutes** – processing can take time
2. **Restart the app**
3. **Tap "Restore Purchases"** in subscription settings
4. **Contact support** with your payment confirmation

### "Can't cancel subscription"

1. Go to Profile → Subscription → "Cancel Subscription"
2. If option not appearing:
   - Refresh the app
   - Sign out and back in
   - Contact support for manual cancellation

---

## Offline Mode Issues

### "Offline protocols not available"

1. **Enable offline mode**: Profile → Settings → Offline Mode → Enable
2. **Download protocols**: Tap "Download Now"
3. **Wait for download to complete** – keep app open
4. **Check storage space** on your device

### "Protocols not downloading"

1. **Connect to Wi-Fi** (large downloads)
2. **Check storage**: Free up space if needed
3. **Keep app open** during download
4. **Stable connection**: Don't switch networks during download

### "Offline search not finding protocols"

1. Protocol may not be cached
2. **Use specific keywords** (offline doesn't use AI)
3. **Check which protocols** are downloaded: Settings → Offline Mode → Manage
4. **Download more protocols** if needed

---

## Performance Issues

### "App is slow or freezing"

1. **Close other apps** to free memory
2. **Restart your device**
3. **Clear app cache**: Profile → Settings → Clear Cache
4. **Reinstall**: Remove from home screen, re-add

### "Battery draining quickly"

1. **Disable background refresh**: Device Settings → Protocol Guide → Background App Refresh → Off
2. **Reduce offline downloads** if not needed
3. **Close app when not using**

### "Using too much data"

1. **Download protocols on Wi-Fi**
2. **Disable automatic updates**: Settings → Offline Mode → Auto-Update → Off
3. **Use offline mode** more frequently

---

## Display Issues

### "Text too small/large"

Profile → Settings → Preferences → Text Size → Adjust

### "Can't see in bright sunlight"

1. Turn on **High Contrast Mode**: Profile → Settings → Accessibility
2. Increase **phone brightness**
3. Use **dark mode**: Profile → Settings → Theme → Light

### "Screen reader not working correctly"

1. Enable **screen reader support**: Profile → Settings → Accessibility
2. Use the **latest version** of VoiceOver (iOS) or TalkBack (Android)
3. Report specific issues to support

---

## Error Messages

### "Network error"

- Check internet connection
- Try again in a few seconds
- Switch between Wi-Fi and cellular

### "Session expired"

- Sign in again
- Normal after extended inactivity

### "Rate limit exceeded" (Free tier)

- Wait until tomorrow (limit resets daily)
- Upgrade to Pro for unlimited searches

### "Service unavailable"

- Servers may be down for maintenance
- Check @ProtocolGuide on Twitter for status
- Try again in a few minutes

### "Protocol not found"

- Protocol may not exist for your region
- Try a different search query
- Check region settings

---

## Getting More Help

### Self-Service

- **FAQ**: protocol-guide.com/faq
- **Status Page**: status.protocol-guide.com
- **Twitter**: @ProtocolGuide

### Contact Support

**Email**: support@protocol-guide.com

**Include in your message**:
- Device type (iPhone 15, Pixel 8, etc.)
- Browser/app version
- Description of the issue
- Screenshots if helpful
- Steps to reproduce

**Response Time**: Within 24 hours on business days

### Emergency

Protocol Guide is a **reference tool**, not for life-threatening emergencies.

**If experiencing a medical emergency**: Call 911

---

**Need help?** Email support@protocol-guide.com
