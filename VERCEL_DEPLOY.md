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

The `vercel.json` file is already configured for SPA routing:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures all routes serve the React app correctly.

## Environment Variables (Optional)

If you add API features later, you can add environment variables in:
- Project Settings → Environment Variables

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps

## Build Optimization

Your `package.json` already has the correct scripts:
```json
{
  "homepage": "/peoples",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "generate-data": "node scripts/data-pipeline.js"
  }
}
```

## Data Files

All 118 country JSON files in `public/data/` will be automatically deployed with your site.

## Performance

- **Initial Load:** ~2-3 seconds (loading 1,030 people)
- **Question Transitions:** Instant (preloaded)
- **Auto-scaling:** Vercel handles traffic automatically

## Troubleshooting

If the build fails:
1. Check that all dependencies are in `package.json`
2. Ensure `public/data/` folder exists with all JSON files
3. Verify `homepage` field matches your deployment path

## Post-Deployment

After deployment, test:
- ✅ Quiz loads correctly
- ✅ Images load from Wikidata
- ✅ Country filter shows all 118 countries
- ✅ Auto-advance works
- ✅ Game mode toggle works
- ✅ Timer delay toggle works

Your quiz will be live at: `https://your-project.vercel.app/peoples`

Happy deploying! 🎉
