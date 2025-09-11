// next-sitemap.config.js
// import 'dotenv/config' // ← فعّلها إذا احتجت متغيرات .env هنا

const siteUrl = process.env.SITE_URL ?? 'https://your-domain.com'; // ← غيّره إلىドومينك

/** @type {import('next-sitemap').IConfig} */
const sitemapConfig = {
  siteUrl,
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 7000,
  alternateRefs: [
    { href: `${siteUrl}/en`, hreflang: 'en' },
    { href: `${siteUrl}/pl`, hreflang: 'pl' },
  ],
};

export default sitemapConfig;
