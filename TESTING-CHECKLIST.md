# 🧪 Testing Checklist - Firebase Script Cleanup

## Quick Testing Guide
Use this checklist to verify the fixes are working correctly.

---

## ✅ Test 1: Selector Page Load
**File**: `select.html`

1. [ ] Open `http://localhost:3000/select.html` (or your local URL)
2. [ ] Open DevTools Console (Cmd+Option+J on Mac)
3. [ ] Check for these logs:
   ```
   🔧 API Base URL: ...
   🚀 Select.js: DOM loaded, initializing...
   ✅ Firebase initialized: [DEFAULT]
   🔑 Authentication check: { userId: "...", tenantId: "..." }
   ```
4. [ ] Verify NO errors appear in console
5. [ ] Verify user info displays correctly (name and business)
6. [ ] Verify two option cards appear (KDS and Dashboard)

**Status**: ⬜ Not Tested | ⏳ Testing | ✅ Passed | ❌ Failed

---

## ✅ Test 2: PIN Verification Flow
**File**: `select.html` → `dashboard.html`

1. [ ] Click on "Dashboard" option card
2. [ ] Verify PIN modal appears with 4 input boxes
3. [ ] Enter your 4-digit PIN
4. [ ] Check console for detailed logs:
   ```
   🔐 Verificando PIN...
      - UserId: ...
      - TenantId: ...
      - PIN ingresado: ****
      - Consultando ruta: users/...
      - Datos de usuario obtenidos: Sí
      - PIN almacenado existe: Sí
   ```
5. [ ] With correct PIN: Should see `✅ PIN correcto, redirigiendo al dashboard...`
6. [ ] Should redirect to dashboard
7. [ ] With incorrect PIN: Should see error message and inputs clear

**Status**: ⬜ Not Tested | ⏳ Testing | ✅ Passed | ❌ Failed

---

## ✅ Test 3: KDS Page
**File**: `kds.html`

1. [ ] Navigate to `http://localhost:3000/kds.html`
2. [ ] Open Console
3. [ ] Verify Firebase loads without errors
4. [ ] Should see order list or "No hay pedidos pendientes"
5. [ ] Check NO duplicate Firebase initialization messages

**Status**: ⬜ Not Tested | ⏳ Testing | ✅ Passed | ❌ Failed

---

## ✅ Test 4: Logout Functionality
**File**: `select.html`

1. [ ] From selector page, click "Cerrar Sesión" button
2. [ ] Should redirect to `auth.html`
3. [ ] LocalStorage should be cleared (check in DevTools → Application → Local Storage)
4. [ ] No errors in console
5. [ ] Can log in again successfully

**Status**: ⬜ Not Tested | ⏳ Testing | ✅ Passed | ❌ Failed

---

## ✅ Test 5: Navigation Between Pages
**Flow**: `auth.html` → `select.html` → `dashboard.html` → `select.html`

1. [ ] Start at auth.html and log in
2. [ ] Should redirect to select.html
3. [ ] Click Dashboard, enter PIN
4. [ ] Should redirect to dashboard.html
5. [ ] Click "Volver al Selector" (if available) or navigate to select.html
6. [ ] Should show selector without requiring login again
7. [ ] All transitions work smoothly without errors

**Status**: ⬜ Not Tested | ⏳ Testing | ✅ Passed | ❌ Failed

---

## 🐛 Common Issues & Solutions

### Issue: "Firebase not initialized" error
**Solution**: 
- Verify script load order in HTML: Firebase SDK → config.js → page.js
- Check browser console for 404 errors on scripts
- Hard refresh (Cmd+Shift+R) to clear cache

### Issue: PIN verification fails even with correct PIN
**Solution**:
- Check console logs for detailed error messages
- Verify userId and tenantId are set in localStorage
- Check Firebase Database Rules allow read access to users/{userId}
- Verify PIN is stored as SHA-256 hash in database

### Issue: Page redirects immediately to auth.html
**Solution**:
- Check localStorage has currentUserId set
- Verify Firebase Auth state is persisted
- Check for auth errors in console

### Issue: Duplicate Firebase initialization warnings
**Solution**:
- Search HTML file for duplicate `<script src="firebase-app-compat.js">` tags
- Search for duplicate `<script src="config.js">` tags
- Ensure only ONE copy of each script

---

## 🔍 Debug Commands

Copy-paste these into the browser console to debug issues:

### Check Firebase Status
\`\`\`javascript
console.log('Firebase apps:', firebase.apps.length);
console.log('Firebase app name:', firebase.app().name);
console.log('Firebase project ID:', firebase.app().options.projectId);
\`\`\`

### Check Authentication Status
\`\`\`javascript
console.log('User ID:', localStorage.getItem('currentUserId'));
console.log('Tenant ID:', localStorage.getItem('currentTenantId'));
console.log('User Name:', localStorage.getItem('userName'));
console.log('Business Name:', localStorage.getItem('businessName'));
\`\`\`

### Check Firebase Connection
\`\`\`javascript
firebase.database().ref('.info/connected').once('value').then(snap => {
    console.log('Firebase connected:', snap.val());
});
\`\`\`

### Test PIN Hash
\`\`\`javascript
async function testPinHash(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('PIN:', pin, '→ Hash:', hash);
    return hash;
}

// Test with your PIN (replace 1234 with your PIN)
testPinHash('1234');
\`\`\`

---

## 📊 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Selector Page Load | ⬜ | |
| PIN Verification | ⬜ | |
| KDS Page | ⬜ | |
| Logout | ⬜ | |
| Navigation Flow | ⬜ | |

**Legend**: ⬜ Not Tested | ⏳ Testing | ✅ Passed | ❌ Failed

---

## 📝 Notes

- Test in **Chrome/Chromium** first (best DevTools support)
- Clear cache before testing (Cmd+Shift+R on Mac)
- Keep Console open during all tests to catch any warnings/errors
- Take screenshots of any errors encountered

---

## ✅ All Tests Passed?

If all tests pass:
1. Mark this session as complete
2. Update project documentation
3. Consider deploying to staging/production

If any tests fail:
1. Note the exact error message
2. Check the debug commands above
3. Review `FIX-DUPLICATE-FIREBASE-SCRIPTS.md` for solutions
4. Report issues with detailed logs

---

**Last Updated**: January 30, 2025
**Related Docs**: FIX-DUPLICATE-FIREBASE-SCRIPTS.md, RESUMEN-MODERNIZACION-30-ENE.md
