/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://your-domain.com', // ← غيّر هذا إلى دومينك الحقيقي
  generateRobotsTxt: true,
  changefreq: 'weekly',
  priority: 0.7,
  sitemapSize: 7000,
  alternateRefs: [
    {
      href: 'https://your-domain.com/en',
      hreflang: 'en',
    },
    {
      href: 'https://your-domain.com/pl',
      hreflang: 'pl',
    },
  ],
};
