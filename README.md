# barkflair.com

Everything in `public/` is the live website.

Deploy on Namecheap: cPanel → Git Version Control → Manage → Pull or Deploy →
**Update from Remote** → **Deploy HEAD Commit**. The `.cpanel.yml` file copies
`public/` into `public_html/` (existing files like the leads CSV and BingSiteAuth.xml are kept).
