# Authentication Setup Instructions

## Issue: "Failed to fetch" Error During Sign-in

The "Failed to fetch" error occurs because the Supabase client cannot connect to your Supabase project. This is typically due to missing or incorrect environment variables.

## Solution Steps

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Project Settings** → **API**
4. Copy the following:
   - **Project URL** (looks like: `https://xxxxxxxx.supabase.co`)
   - **anon public key** (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 2. Configure Environment Variables

Create or update the `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Xion Blockchain Configuration
NEXT_PUBLIC_XION_RPC_URL=https://rpc.xion-testnet-1.burnt.com
NEXT_PUBLIC_XION_CHAIN_ID=xion-testnet-1
NEXT_PUBLIC_XION_DENOM=uxion
NEXT_PUBLIC_XION_PREFIX=xion

# Contract Addresses (to be filled after deployment)
NEXT_PUBLIC_COMMUNITY_WATCH_CONTRACT=
NEXT_PUBLIC_GOVERNANCE_CONTRACT=
NEXT_PUBLIC_IDENTITY_CONTRACT=
```

**Replace:**
- `your-project-url` with your actual Supabase project URL
- `your-anon-key` with your actual Supabase anon key

### 3. Restart Development Server

After updating the `.env.local` file, restart your development server:

```bash
npm run dev
```

### 4. Verify Configuration

Check that the environment variables are loaded correctly:

1. Open browser console (F12)
2. Navigate to the login page
3. Try to sign in
4. Check console for any Supabase connection errors

### 5. Test Authentication

1. Create a test user in Supabase Dashboard:
   - Go to **Authentication** → **Users**
   - Click **Add User** → **Create New User**
   - Enter email and password
   - Click **Create User**

2. Try signing in with those credentials

### 6. Check Supabase Project Status

Ensure your Supabase project is:
- ✅ Active (not paused)
- ✅ Has the correct region selected
- ✅ Has email authentication enabled
- ✅ Has the correct CORS settings (if needed)

## Common Issues & Solutions

### Issue: "Failed to fetch" persists after configuration

**Possible causes:**
1. **Incorrect URL format** - Ensure URL starts with `https://`
2. **Invalid API key** - Double-check the anon key is correct
3. **Project paused** - Check Supabase dashboard for project status
4. **Network issues** - Check internet connection
5. **CORS issues** - Add your localhost to Supabase CORS settings

**Solution:**
```bash
# Verify environment variables are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Issue: Environment variables not loading

**Solution:**
1. Ensure `.env.local` is in the project root
2. Restart the development server
3. Check the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)

### Issue: Supabase project not accessible

**Solution:**
1. Check Supabase service status at [status.supabase.com](https://status.supabase.com/)
2. Verify your project is not paused in the dashboard
3. Check your Supabase billing status

## Additional Configuration

### Enable Email Authentication

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email settings (SMTP or use Supabase email)
4. Enable **Confirm email** if desired

### Set Up Database Tables

Run the database migration to create required tables:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL migration
# Copy the SQL from database-complete-migration.sql
# Run it in Supabase Dashboard → SQL Editor
```

## Testing Checklist

- [ ] Environment variables configured correctly
- [ ] Development server restarted
- [ ] Supabase project is active
- [ ] Email authentication enabled
- [ ] Test user created in Supabase
- [ ] Can successfully sign in with test credentials
- [ ] Console shows no Supabase connection errors

## Support

If issues persist:
1. Check browser console for specific error messages
2. Check Supabase dashboard logs
3. Verify network connectivity to Supabase
4. Ensure no firewall/proxy is blocking requests

## Quick Fix Command

If you want to quickly test if the issue is environment variables:

```bash
# Test if environment variables are accessible
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL); console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')"
```

If this shows "NOT SET" for the key, your environment variables are not being loaded properly.
