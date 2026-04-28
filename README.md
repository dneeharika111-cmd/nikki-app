# AI Visibility Tool

A modern web application built with Next.js and Tailwind CSS to simulate how a brand appears in AI-generated search answers.

## Features

- Input fields for keyword, brand name, and website URL
- "Analyze" action that calls a Next.js API route
- Backend simulation for:
  - AI search query generation
  - AI answer simulation
  - Brand mention extraction
  - Visibility score calculation
- Frontend dashboard showing:
  - Visibility score
  - Query results
  - Competitor brands

## Project Structure

```text
ai-visibility-tool/
|-- app/
|   |-- api/
|   |   `-- analyze/
|   |       `-- route.ts
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- components/
|   `-- analyze-form.tsx
|-- lib/
|   |-- analysis.ts
|   `-- types.ts
|-- next-env.d.ts
|-- next.config.ts
|-- package.json
|-- postcss.config.js
|-- README.md
|-- tailwind.config.ts
`-- tsconfig.json
```

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the app:

   [http://localhost:3000](http://localhost:3000)

## How It Works

1. The frontend collects keyword, brand name, and website URL.
2. The API route generates a set of AI-style search prompts.
3. The backend simulates AI answers that include the target brand and competitor brands.
4. Mentions are extracted from each answer.
5. A visibility score is calculated based on how often the target brand appears.
