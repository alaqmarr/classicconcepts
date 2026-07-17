# Classic Concepts - Development Instructions

## Tech Stack
- **Framework**: Next.js (App Router, React 19)
- **Styling**: Tailwind CSS
- **Database**: Prisma ORM with SQLite
- **Storage**: Cloudflare R2
- **Notifications**: React Hot Toast
- **Email**: Nodemailer with Gmail SMTP

## Routes Overview
- `/`: Home page (Modern, high speed, SEO optimized)
- `/about`: Main About page
- `/about/infrastructure`: Infrastructure details
- `/about/press`: Press releases and news
- `/about/clients`: Client list and testimonials
- `/shop`: All products listing
- `/shop/c`: All categories listing
- `/shop/c/:category`: Category-specific products listing
- `/shop/p/:id`: Product-specific page
- `/contact`: Contact form and details
- `/blogs`: Blog listing
- `/podiums`: Dedicated podium category page
- `/admin/*`: Secure dashboard for managing content

## Development Rules
1. **Mobile-First**: Always start styling for mobile (`w-full`, `flex-col`) and scale up using Tailwind breakpoints (`md:`, `lg:`).
2. **Modern UI/UX**: Use `framer-motion` for subtle animations. Use the defined brand colors.
3. **SEO**: Utilize Next.js Metadata API in `layout.tsx` and `page.tsx` for proper title tags, descriptions, and OpenGraph images.
4. **Images**: Use Cloudflare R2 URLs for final deployment. For local development, use mock images generated or placeholder URLs.

## Database (Prisma)
- The schema is located at `prisma/schema.prisma`.
- To update the database after schema changes: `npx prisma db push`.
- To open Prisma Studio: `npx prisma studio`.
