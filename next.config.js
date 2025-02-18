/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [
      'yt3.ggpht.com',
      'yt3.googleusercontent.com',
      'i.ytimg.com',
      'images.netlify.com'
    ],
    unoptimized: true
  },
  env: {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
  }
}

module.exports = nextConfig 