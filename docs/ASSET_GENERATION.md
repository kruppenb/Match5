# Generating Images with Gemini AI

This project uses Google's Gemini AI to generate game assets. Requires `GEMINI_API_KEY` environment variable.

## Dependencies

```bash
npm install @google/genai  # Gemini SDK
npm install sharp -D       # Image resizing
```

## Basic Image Generation Script

```typescript
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function generateImage(prompt: string, outputPath: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp-image-generation',
    contents: prompt,
    config: {
      responseModalities: ['Text', 'Image']
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  for (const part of parts || []) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync(outputPath, buffer);
      console.log(`Saved: ${outputPath}`);
      return;
    }
  }
}

// Usage
generateImage(
  'Game gem icon, red ruby, 2D sprite style, transparent background',
  'public/assets/sprites/gems/red.png'
);
```

## Resizing Generated Images

Gemini often outputs 1024x1024. Use sharp to resize:

```typescript
import sharp from 'sharp';

await sharp('input.png')
  .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile('output.png');
```

## Existing Generator Scripts

| Script | Purpose |
|--------|---------|
| `scripts/generate-pwa-icons.ts` | PWA app icons (512, 192, 180, 32px) |
| `scripts/generate-screenshots.ts` | PWA store screenshots |
| `scripts/resize-icons.ts` | Resize & create maskable icons |
| `scripts/generate-assets.py` | Python asset generator (alternative) |

## Running Generators

```powershell
$env:GEMINI_API_KEY = "your-api-key"
npx tsx scripts/generate-pwa-icons.ts
npx tsx scripts/resize-icons.ts
```

## Prompt Tips for Game Assets

**Include these terms:**
- `2D sprite style`
- `game asset`
- `clean edges`

**For icons:**
- `centered composition`
- `solid background color #1a1a2e`

**For tiles:**
- `transparent background`
- `64x64 pixel art`

**Avoid:**
- `text`
- `watermarks`
- `3D rendering`
