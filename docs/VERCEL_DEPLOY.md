# 🚀 DEPLOY TO VERCEL

## Quick Deploy Steps:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ultra-minimalistic quiz"
   git push origin main
   ```

2. **Import on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository

3. **Build Settings:**
   - **Framework Preset:** Create React App
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

4. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your quiz will be live!

## Vercel Configuration

The `vercel.json` file is configured for SPA routing with proper static asset handling:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/data/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ]
    }
  ]
}
```

This ensures:
- All routes serve the React app correctly (SPA routing)
- Static files in `/data/` and `/static/` are served with proper caching headers
- JSON files are served with correct content type

## Environment Variables (Optional)

If you add API features later, you can add environment variables in:
- Project Settings → Environment Variables

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps

## Build Optimization

Your `package.json` has the correct configuration for Vercel:
```json
{
  "homepage": ".",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "generate-data": "node scripts/data-pipeline.js"
  }
}
```

**Important:** The `homepage` field is set to `"."` for Vercel deployment (root path). If you also deploy to GitHub Pages, you may need to change it to `"/peoples"` for that platform.

## Data Files

All 118 country JSON files in `public/data/` will be automatically deployed with your site.

## Performance

- **Initial Load:** ~2-3 seconds (loading 1,030 people)
- **Question Transitions:** Instant (preloaded)
- **Auto-scaling:** Vercel handles traffic automatically

## Troubleshooting

### Build Fails
1. Check that all dependencies are in `package.json`
2. Ensure `public/data/` folder exists with all JSON files
3. Verify `homepage` field is set to `"."` for Vercel (root deployment)

### Data Files Not Loading
1. Check browser console for 404 errors on `/data/*.json` files
2. Verify `vercel.json` is in the root directory
3. Ensure `public/data/` files are committed to git
4. Check that build output includes `build/data/` directory

### Routes Not Working
1. Verify `vercel.json` has the rewrite rule for SPA routing
2. Check that static files are being served (Vercel serves them automatically)
3. Clear browser cache and try again

## Post-Deployment

After deployment, test:
- ✅ Quiz loads correctly
- ✅ Images load from Wikidata
- ✅ Country filter shows all 118 countries
- ✅ Auto-advance works
- ✅ Game mode toggle works
- ✅ Timer delay toggle works

Your quiz will be live at: `https://your-project.vercel.app` (root domain, no subdirectory)

Happy deploying! 🎉
