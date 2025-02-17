# YouTube Channel Search Tool

A powerful Next.js application for searching and analyzing YouTube channels. Find channels based on various criteria, track API quota usage, and manage excluded channels efficiently.

![Next.js](https://img.shields.io/badge/Next.js-13+-000000?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0+-38B2AC?style=for-the-badge&logo=tailwind-css)

## 🌟 Features

- 🔍 Advanced YouTube channel search with multiple filters
- 📊 Smart quota management for YouTube API keys
- 📧 Email detection in channel descriptions
- 📥 Import/Export functionality for channel lists
- 🎯 Channel exclusion management
- 💾 Local data storage with compression
- 🌐 Modern, responsive UI with dark mode support

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- YouTube Data API v3 key(s)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/youtube-channel-search.git
cd youtube-channel-search
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setting Up YouTube API

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the YouTube Data API v3
4. Create API credentials
5. Add your API key in the app's settings page

## 📖 Usage

1. **Search for Channels**
   - Use various filters like subscriber count, email presence, etc.
   - Export results in CSV or JSON format
   - View detailed channel information

2. **Manage API Keys**
   - Add multiple YouTube API keys
   - Monitor quota usage
   - Automatic key rotation when quota is exceeded

3. **Exclude Channels**
   - Maintain a list of excluded channels
   - Import/Export exclusion lists
   - Automatically filter out excluded channels from searches

## 🏗️ Tech Stack

- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks
- **Data Storage**: Local JSON with compression
- **API**: YouTube Data API v3

## 🌐 Free Hosting Options

1. **Vercel** (Recommended):
   - Best option for Next.js apps
   - Steps:
     1. Fork this repository to your GitHub account
     2. Go to [Vercel](https://vercel.com)
     3. Sign up with your GitHub account
     4. Click "Import Project"
     5. Select your forked repository
     6. Deploy automatically

2. **Netlify**:
   - Also great for Next.js apps
   - Steps:
     1. Go to [Netlify](https://netlify.com)
     2. Sign up and connect your GitHub
     3. Click "New site from Git"
     4. Select your repository
     5. Set build command: `npm run build`
     6. Set publish directory: `.next`

3. **GitHub Pages**:
   - Requires additional configuration
   - Use the `next export` command
   - Set up GitHub Actions for deployment

## ⚠️ Important Notes

- The app stores data locally in the `/data` directory
- API keys are stored locally and should be kept secure
- Quota resets daily at midnight PT
- Each API key has a daily limit of 10,000 units
- Search operations use approximately 100-150 quota units

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
