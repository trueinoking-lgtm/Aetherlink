# Service Worker Fix - PWA Redirect Issues

## Problem
Users experience "The FetchEvent for ... resulted in a network error response: a redirected response was used for a request whose redirect mode is not 'follow'" errors when accessing the PWA.

## Root Cause
1. **PWA Manifest**: `start_url` was set to `/feed` instead of `/`
2. **Service Worker**: Tried to cache authentication-protected routes (`/feed`, `/dashboard`, etc.)
3. **Redirect Loop**: `/feed` → `/` (not authenticated) → Service Worker confusion
4. **Icons Issue**: Production manifest had wrong icon paths (`/icon-192.png` vs `/favicons/android-chrome-192x192.png`)

## Solution Applied

### 1. **Manifest Fix** (`/apps/webapp/public/manifest.json`)
```json
"start_url": "/"  // Changed from "/feed"
```

### 2. **Service Worker Fix** (`/apps/webapp/public/sw.js`)
- Added `PROTECTED_ROUTES` list that are NEVER cached
- Skip caching for: `/dashboard`, `/feed`, `/cv`, `/applied`, `/onboarding`, `/tracker`
- Skip caching for dynamic routes: `/feed/`, `/api/auth/`, `/api/`
- Only cache successful responses (not redirects: 301, 302, 307, 308)
- Cache version bumped to `v5`

### 3. **Registration Update** (`/apps/webapp/public/register-sw.js`)
- Version bumped to `v5` to force update
- Added console logging for debugging
- Better error handling

## Technical Details

### Protected Routes Logic
```javascript
const PROTECTED_ROUTES = [
  '/dashboard',
  '/feed',
  '/cv',
  '/applied',
  '/onboarding',
  '/tracker'
];

function isProtectedRoute(url) {
  const pathname = new URL(url).pathname;
  
  // Exact matches
  if (PROTECTED_ROUTES.some(route => pathname === route)) {
    return true;
  }
  
  // Dynamic route patterns
  if (pathname.startsWith('/feed/') || 
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/')) {
    return true;
  }
  
  return false;
}
```

### Fetch Strategy
1. **Protected Routes**: Network only, no caching
2. **Static Assets**: Cache-first with network fallback
3. **Public Routes** (`/`, `/privacy`, `/terms`): Network-first with cache fallback
4. **Redirects**: Never cached (301, 302, 307, 308)

## Deployment

### 1. **Local Test**
```bash
cd /root/Aetherlink
pnpm --filter @aetherlink/webapp build
pnpm --filter @aetherlink/webapp dev
```

### 2. **Railway Deployment**
1. Push changes to GitHub
2. Railway auto-deploys from main branch
3. Clear browser cache for existing users

### 3. **User Cache Clearing**
Existing users should:
1. Open DevTools → Application → Service Workers
2. Click "Unregister"
3. Refresh page

## Verification
1. **PWA Installation**: Should open to `/` (home page) not `/feed`
2. **Console Errors**: No "redirected response was used for a request whose redirect mode is not 'follow'" errors
3. **Authentication**: Users can sign in without service worker interference
4. **Offline Support**: Static assets still cached, protected routes bypass cache

## Future Improvements
1. **Authentication-aware caching**: Cache user-specific data after login
2. **Background sync**: Queue job applications for offline submission
3. **Push notifications**: Job application status updates
4. **Analytics**: Track service worker performance and errors

## Files Modified
- `/apps/webapp/public/manifest.json` - Fixed `start_url` and icon paths
- `/apps/webapp/public/sw.js` - Added protected routes logic
- `/apps/webapp/public/register-sw.js` - Updated version and logging
- `/SERVICE_WORKER_FIX.md` - This documentation

## Testing Checklist
- [ ] PWA opens to home page (`/`) not feed (`/feed`)
- [ ] No service worker errors in console
- [ ] Authentication flow works (Google OAuth)
- [ ] Protected routes load without caching issues
- [ ] Static assets cache correctly
- [ ] Offline mode works for public pages

## Rollback Plan
If issues persist:
1. Disable service worker registration temporarily
2. Revert to previous cache version (`v4`)
3. Remove protected routes logic

---

**Status**: ✅ Fix applied, ready for deployment
**Next Action**: Deploy to Railway and test production
**Priority**: High (PWA functionality broken for existing users)
**Impact**: All PWA users experiencing redirect errors