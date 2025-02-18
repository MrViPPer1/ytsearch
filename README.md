# YouTube Search Leads

A Next.js application for searching YouTube channels and extracting contact information. Built with TypeScript, Next.js 14 App Router, Shadcn UI, and Tailwind CSS.

## Features

- 🔍 Search YouTube channels by keywords and criteria
- 📧 Extract email addresses from channel descriptions and about pages
- 📊 Track YouTube API quota usage in real-time
- 🔑 Manage multiple YouTube API keys with automatic rotation
- 🎨 Modern UI with dark/light mode support
- 🚀 Built with performance and scalability in mind

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Hook Form
- Zod Validation
- YouTube Data API v3

## Getting Started

### Prerequisites

- Node.js 18.x or later
- pnpm package manager
- YouTube Data API key(s)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ytsearchleads.git
cd ytsearchleads
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setting Up YouTube API

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create API credentials (API Key)
5. Add the API key in the application's settings page

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Deployment

The application is configured for deployment on Netlify. The `netlify.toml` file includes all necessary build settings.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/yourusername/ytsearchleads)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
