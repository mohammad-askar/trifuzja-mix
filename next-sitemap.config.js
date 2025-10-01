// next-sitemap.config.js
const siteUrl = process.env.SITE_URL ?? 'https://initiativa-autonoma.com';

const sitemapConfig = {
  siteUrl,
  generateRobotsTxt: false, // ← لا تولّد robots.txt لأن عندك app/robots.ts
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 7000,
  alternateRefs: [
    { href: `${siteUrl}/en`, hreflang: 'en' },
    { href: `${siteUrl}/pl`, hreflang: 'pl' },
  ],
};

export default sitemapConfig;
