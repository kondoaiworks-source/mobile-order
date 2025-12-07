/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // キャッシュヘッダーを設定して、ブラウザが新しいバージョンを取得するようにする
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

