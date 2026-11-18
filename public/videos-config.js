/* ===== BARKFLAIR VIDEOS =====
   Paste a link between the quotes, save, and refresh barkflair.com.
   - YouTube: a Shorts link (https://youtube.com/shorts/...) or a normal link (https://www.youtube.com/watch?v=...).
     Unlisted videos work. Keep "Allow embedding" on in YouTube Studio.
   - Bunny Stream (recommended, no branding): paste the video's link from Bunny,
     like "https://player.mediadelivery.net/play/789711/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
     Bunny videos autoplay muted as people scroll, and visitors tap for sound.
   - Or a file on your hosting, like "/videos/portfolio-1.mp4".
   Leave url empty ("") to hide that slot.
   shape: "vertical" for 9:16 videos, "wide" for 16:9 videos.
*/
window.BARKFLAIR_VIDEOS = {

  // Your Bunny Stream delivery address (Bunny > Stream > your library > API > CDN Hostname). Set once.
  bunnyHost: "vz-730e05ea-f50.b-cdn.net",

  // Big "Featured edit" video at the top of the portfolio (leave empty to keep the Google Drive video)
  featured: "https://player.mediadelivery.net/play/789711/f03d7a6b-42ba-43f7-80ed-b270f49aaaa9",

  // The 6 portfolio videos, in order
  portfolio: [
    { url: "", title: "Short-form reel",   subtitle: "Reels · TikTok · Shorts", shape: "vertical" },
    { url: "", title: "Social media ad",   subtitle: "Meta · TikTok ads",       shape: "vertical" },
    { url: "", title: "UGC ad",            subtitle: "Creator-style ad",        shape: "vertical" },
    { url: "", title: "VSL / promo video", subtitle: "Sales & promo edit",      shape: "vertical" },
    { url: "", title: "Real estate reel",  subtitle: "Listing video",           shape: "vertical" },
    { url: "", title: "Motion graphics",   subtitle: "Animation & text",        shape: "vertical" }
  ]
};
