# Classic Concepts UX, Positioning & Architecture Overhaul (`changesrequired.md`)

> **Implementation Status & Finalized Owner Decisions (Completed)**
> - **AI Assistant Branded `"ACRIO"` & Unified Search Modal**: Named our AI assistant **ACRIO** everywhere (`claude-haiku-5-5`, separate Client & Admin API keys, strict plain layman English, zero em-dashes or AI buzzwords). Unified Search + **"Talk to ACRIO"** into a single clean modal (`GlobalSearchModal`) across the Header (`⌘K`), floating button, visitor entrance prompt, and on-page catalog search bars (`ShopSmartSearchBar`).
> - **Point 1 (`"Since 2008"`)**: Standardized sitewide to **"Since 2008"** across Layout/SEO metadata, Home Hero, About Us, Podiums, Footer, and ACRIO knowledge base.
> - **Point 2 (Podium Patent & Copyright Hover Info Icon)**: Added an interactive top-right **Info (`i`) icon** on every podium card (`isPodium === true`) showing Patent, Registered Design & Copyright protection details immediately on hover (and mobile tap), inline-editable in Admin Edit Mode and configurable per podium in `ProductForm`, plus an IP protection + 3-Range Comparison + Safe Wooden Crated Delivery guide on `/podiums`.
> - **Point 3 (Keep Existing Card Buttons)**: Kept the existing `Add` and `Enquire` buttons on product and podium cards intact.
> - **Point 4 & 5 (Admin Smart Category -> Subcategory Converter, Merger & 1-Click Alignment)**: Built `taxonomy-engine.ts`, `/api/admin/taxonomy`, and `CategorySmartManager.tsx` (`/admin/categories`) with 1-Click Smart Grouping Preview, Convert Selected Categories -> Subcategories under any existing/new Parent Category, Merge Categories, and 1-Click Fix Spelling/Descriptions/Sync. Atomically updates `Product.categoryId` + `Product.subCategoryId` inside Prisma transactions and automatically 307/308 redirects legacy `/shop/c/<converted-sub-slug>` URLs to `/shop/c/<parent-slug>?sub=<converted-sub-slug>` so zero live production URLs ever 404.
> - **Point 6 (Category & Subcategory Descriptions)**: Added plain summary `description` + rich `descriptionHtml` + **"Write with ACRIO"** 1-click generator and live inline editing for both Categories and Subcategories, rendered cleanly with Subcategory Filter Pills on `/shop/c/[slug]`.
> - **Point 7 (Mobile 2-Column Clean Product Grid)**: Updated all shop/category/podium product grids to `grid-cols-2` side-by-side on mobile (`gap-3`), hiding secondary badges/prices on mobile so mobile cards show **only Image + Product Name + `Add`/`Enquire` Buttons** (plus the small IP info icon on podiums).
> - **Public Empty Category Hiding & Console Polish**: Auto-hid `0`-product categories on public navigation, `/shop`, `/shop/c`, and Footer (while labeling them `"0 products (Hidden on site)"` in Admin), fixed `/logo.png` aspect-ratio warning in `Footer.tsx`, and updated `/contact` & `Footer.tsx` fallback addresses to Secunderabad, Hyderabad.

> **Source Inputs Reviewed & Reconciled**
> 1. **UX & B2B Positioning Audit PDF** (30 pages: *Product-Wise & Industry-Wise Taxonomy + 25-Point Live Website Audit*).
> 2. **[inputs.txt](file:///c:/Users/DELL/Desktop/classicconcepts/inputs.txt)** (1,928 lines: *20-Point Podiums Deep-Dive + Master "One Product Database, Two Browsing Routes" Functional Specification*).
> 3. **Current Codebase & Database Audit** (`Next.js 16.2 App Router + Prisma + SQLite`, including recently added Smart Inline Editing, Plain-Language AI Concierge, and Smart Search).

---

## 1. Executive Summary & Core Strategic Shift

Right now, `classicconcepts.in` has strong underlying credibility (16,000 sq. ft. factory, 188+ live products, 27 podium models, ISO certification, 100+ marquee clients), but its structure makes it look like an **online retail shop mixed with a company brochure** rather than a **large-scale custom and institutional acrylic manufacturer**.

### The North-Star Positioning Shift
- **From:** *"We sell dozens of small acrylic items in 50+ scattered categories."*
- **To:** *"We are a specialist Indian acrylic manufacturing company (Established 2008, 16,000 sq. ft. factory) that designs and manufactures everything from a single custom prototype or stage podium to large-volume institutional, retail, healthcare, and industrial rollouts."*

### The Core Architecture Rule (Locked from `inputs.txt`)
- **ONE Master Product Database (`Product` table) -> ZERO Duplicate Products.**
- Customers discover the exact same master products through **three clear 2-click paths**:
  1. **Product-Wise (`PRODUCTS` -> 12 Main Families -> Same-Page Filter Tabs -> Product)**: For buyers who already know the item they want (e.g., *"I need a podium"* or *"I need a QR stand"*).
  2. **Industry-Wise (`INDUSTRIES` -> 10 Core Sectors -> Solution Groups + Recommended Products)**: For buyers who only know their venue or work (e.g., *"I am setting up a hospital / school / hotel"*).
  3. **Custom Manufacturing (`CUSTOM FABRICATION` -> Capabilities + Send Drawing / Photo on WhatsApp)**: For B2B buyers with a sketch, CAD file, photo, or bulk OEM requirement.

---

## 2. Key Conflicts Between the PDF & `inputs.txt` (And Recommended Resolution)

Before writing code, three structural differences between the early ChatGPT PDF brainstorm and the refined specification in `inputs.txt` must be aligned:

| Topic | PDF Proposal | `inputs.txt` Refined Spec | Recommended Resolution |
| :--- | :--- | :--- | :--- |
| **1. Subcategories vs Same-Page Filter Tabs** | Page 8 suggested `Main Category -> Subcategory -> Product` (3 levels). | Lines 608-650 & 907-923 strictly state: **"Do NOT create separate subcategory pages... Filters must work on the SAME PAGE. Max 2 clicks to reach products."** | **Follow `inputs.txt`**: Keep URL depth flat (`/shop/c/<12-main-slugs>`) and add horizontal scrollable **Same-Page Filter Tabs** (`All \| Counter \| Floor \| QR Stands \| ...`) powered by a `subType` tag on `Product` (plus 301 redirects from old granular category slugs so existing Google links never 404). *Exception: Keep `/podiums` range filters (`Essential`, `Classic Signature`, `Premium`) working smoothly on `/podiums`.* |
| **2. Number of Industries** | Pages 5-8 listed **20 granular industries** (splitting Jewellery, Saree/Fashion, Banks, Museums, Media, PSU, etc.). | Lines 718-731 & 1918-1928 consolidate into **10 focused flagship industries** (with optional *"Other Industries"* later) so every industry page has rich environment photos and real products. | **Launch with the 10 flagship industries from `inputs.txt`** so zero industry pages look thin or empty, while folding sub-sectors (e.g., Jewellery/Fashion into *Retail & Visual Merchandising*; Banks/PSU into *Corporate & Institutional*) into each page's Solution Groups. |
| **3. Founding Year ("20+ Years" vs "Since 2008")** | Page 15 flags that *"Two Decades / 20+ Years"* is slightly ahead of 2008 in 2026 (18 years) and recommends **"Since 2008"** or **"Nearly Two Decades"**, noting Classic Edge 53 says *"25+ Years"*. | Lines 315 & 518 also use **"Manufacturing Since 2008"**. | **Standardize sitewide to `"Since 2008"`** (e.g., *"Manufacturing Excellence Since 2008 \| 16,000 Sq. Ft. Facility"*), pending final confirmation of exact group founding year vs incorporation year. |

---

## 3. Current Codebase Readiness Snapshot (What Already Exists vs What Needs Work)

| Capability | Current Status in Repo | Gap to Close |
| :--- | :--- | :--- |
| **Master Product DB + Industry M:N Tags** | **Built** (`Product` <-> `Industry[]` & `ProblemStatement[]` in [schema.prisma](file:///c:/Users/DELL/Desktop/classicconcepts/prisma/schema.prisma)) | Add `subType` (for same-page filter tabs), `dispatchLabel`, `isRegisteredDesign`, `designRegistrationNo`, `warrantyYears`, and `idealFor` / `customizable` fields; run migration script to consolidate 50+ live categories into 12 families. |
| **Empty Category Hiding (`0` products)** | **Missing** ([layout.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/layout.tsx), [shop/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/shop/page.tsx), [Footer.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/layout/Footer.tsx) fetch all categories unconditionally) | Enforce `where: { products: { some: {} } }` on all public category queries so 0-product categories (`Display Board`, `Acrylic F&B Products`, `Acrylic Lighting`, `Shoe Box`, `Sliding Signage`) automatically stay hidden. |
| **Smart Layman Search & Concierge** | **Built** ([ShopSmartSearchBar.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/ai/ShopSmartSearchBar.tsx), [GlobalSearchModal.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/ai/GlobalSearchModal.tsx), [CustomerConciergeModal.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/ai/CustomerConciergeModal.tsx)) | Add a prominent inline search bar section on Homepage/Header (*"What are you looking for? Search products, applications or industries..."*) and expand local synonym matching for new 10 industries + `subType` tags. |
| **Universal Inline Admin Editing** | **Built** (`EditableText`, `EditableImage`, `InlineProductEditorDrawer`) | Ensure all newly created pages (`/industries`, `/custom-fabrication`, `/projects`, upgraded `/podiums`) use `EditableText` and `EditableImage` out of the box. |
| **Main Navigation & Footer** | **Needs Overhaul** ([Header.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/layout/Header.tsx), [Footer.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/layout/Footer.tsx)) | Replace `"SHOP"` & `"OTHER USEFUL LINKS"` with `"PRODUCTS"` (12 families), `"INDUSTRIES"`, `"CUSTOM FABRICATION"`, `"ACRYLIC PODIUMS"`, `"PROJECTS"`, `"RESOURCES"`, `"CLASSIC EDGE 53 ↗"`, `"CONTACT"`, plus a highlighted `"GET A QUOTE"` button; restructure Footer into 4 clean B2B columns. |
| **Podiums Category-Selling Experience** | **Partial** ([podiums/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/podiums/page.tsx) has 3 ranges + AI search) | Build the 13-part category-selling layout, Range Comparison Table, Registered Design IP strip/badges, 3-Model Comparison Tool, *"Help Me Choose"* 4-question selector, Real Installations gallery, Crated Packaging section, and 5-Year Warranty explainer. |
| **Industry Landing Pages** | **Partial** ([shop/industry/[slug]/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/shop/industry/%5Bslug%5D/page.tsx) looks like a plain product grid) | Create `/industries` index + upgrade `/industries/[slug]` (with redirect from `/shop/industry/[slug]`) to show Environment Hero -> Intro -> Solution Groups -> 6-8 Recommended Master Products -> *"View All Products for This Industry"* -> Custom Requirement CTA. |
| **Custom Acrylic Fabrication Page** | **Missing** | Build dedicated `/custom-fabrication` page with 10 capability blocks + *"Send Drawing / Photo on WhatsApp"* + quote upload form. |
| **Projects / Case Studies Section** | **Missing** | Add `Project` model in Prisma + Admin CRUD + `/projects` & `/projects/[slug]` showcase + Homepage Featured Projects strip. |
| **Product Cards & Detail Pages** | **Needs UX Polish** ([ProductCard.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/shop/ProductCard.tsx), [InteractiveProductView.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/shop/p/%5Bslug%5D/InteractiveProductView.tsx)) | Replace `"Add"` / `"Add Enquire"` with `"View Details"` + `"Get Quote"` / `"Enquire Now"`; tone down 40-50% red discount badges; replace `"In stock"` with `"Ready / Made to Order"` or dispatch days; show SKU/Model No., custom size note, Ideal For tags, Custom Logo upload/options on podiums, Lead Time, Shipping & Warranty. |

---

## 4. Detailed Changes Required (By Area & Priority)

### Phase 1: Critical Taxonomy, Navigation & Trust Cleanup (`🔴 Must Priority`)

#### 1.1 Consolidate 50+ Granular Categories into 12 Main Product Categories
- **Problem:** Items like `Cross`, `Lids`, `A4 T Stand`, `A4 T Stand Landscape`, `Bottles`, `Candy Bin`, `Domes`, `Hangers`, `Milk Box`, `Mobile Stand`, `Paper Weight`, `Pen Stand`, `Shoe Box`, `Tissue Paper Box`, and `Visiting Card Holder` currently appear as top-level categories, making a major factory look like a small bazaar.
- **Target 12 Main Product Categories (under `PRODUCTS`):**
  1. **Acrylic Podiums & Lecterns** *(routes to `/podiums` or `/shop/c/acrylic-podiums`)*
  2. **Display Solutions** *(Product stands, counter/floor displays, brochure holders, A4 T-stands, cosmetic/electronics/seed displays)*
  3. **Signage & Branding** *(Company name boards, office/directional/door/hospital/safety/sliding/LED signage, QR stands, menu stands, logo displays)*
  4. **Boxes & Enclosures** *(Clear boxes, display/donation/ballot/storage/shoe/watch/gift boxes, domes, industrial covers)*
  5. **Awards & Mementos** *(Acrylic mementos, trophies, plaques, paperweights, miniatures, keychains, badges, corporate gifts)*
  6. **Retail & Visual Merchandising** *(Retail fixtures, risers, POS/POP displays, shelf displays, jewellery stands, saree/textile trays, footwear stands)*
  7. **Furniture & Interiors** *(Acrylic tables, side tables, chairs/stools, consoles, shelves, partitions, jali, decorative panels, lighting)*
  8. **Food & Beverage Products** *(Beverage dispensers, food displays, candy bins, bakery displays, food covers, menu stands, tissue boxes, serving trays)*
  9. **Office & Utility Products** *(Visiting card holders, mobile/laptop/pen stands, document holders, desk organisers, reception accessories)*
  10. **Industrial Acrylic Products** *(Machine guards, safety barriers, equipment/control panel enclosures, CNC/laser cut technical parts, glove/lab enclosures)*
  11. **Religious & Institutional Products** *(Church podiums, acrylic crosses, donation boxes, acrylic temples, honour boards, institutional boards)*
  12. **Custom Acrylic Fabrication** *(Links to `/custom-fabrication` + custom-built B2B items)*
- **Technical Changes Required:**
  - Add `subType String?` (e.g., `"A4 T Stand"`, `"QR Stand"`, `"Donation Box"`, `"Cross"`) and `sortOrder Int @default(0)` to `Category` and `Product` in [schema.prisma](file:///c:/Users/DELL/Desktop/classicconcepts/prisma/schema.prisma).
  - Write an idempotent migration script (`scripts/migrate-12-categories.ts`) that maps existing products from the 50+ old categories into the 12 main categories while preserving the old category name inside `product.subType` so **zero products are lost** and **same-page filter pills** (`All | A4 T-Stands | Brochure Holders | Jewellery | ...`) work automatically!
  - Add a legacy slug redirect map in `/shop/c/[slug]/page.tsx` so old bookmarked URLs cleanly `permanentRedirect()` to `/shop/c/<new-main-slug>?type=<old-subType>`.

#### 1.2 Auto-Hide Empty (`0`-Product) Categories Everywhere
- **Rule:** Any category with `0` active products must automatically stay hidden from public menus, sidebars, homepage tiles, and footers (while remaining visible in `/admin/categories` with a `"0 products (Hidden on site)"` badge so admins can populate them first).
- **Files to Update:**
  - [src/app/layout.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/layout.tsx)
  - [src/app/shop/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/shop/page.tsx)
  - [src/app/shop/c/[slug]/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/shop/c/%5Bslug%5D/page.tsx)
  - [src/lib/ai-context.ts](file:///c:/Users/DELL/Desktop/classicconcepts/src/lib/ai-context.ts)

#### 1.3 Simplify Main Header Navigation & Footer
- **Current Header ([Header.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/layout/Header.tsx)):** `HOME | ABOUT US | SHOP | ACRYLIC PODIUM | CLASSIC EDGE 53 | OTHER USEFUL LINKS | CONTACT US`
- **New Header Structure:**
  - `HOME`
  - `ABOUT` *(Dropdown: Company Profile, Infrastructure & Machinery, Our Clients, Certificates & Registrations, Press & Media, Our Team)*
  - `PRODUCTS` *(Clean 2-column dropdown showing ONLY the active main categories + "View All Products")*
  - `INDUSTRIES` *(Dropdown showing the 10 core industries + "View All Industries")*
  - `CUSTOM FABRICATION` *(Direct link to `/custom-fabrication`)*
  - `ACRYLIC PODIUMS` *(Dropdown: Essential, Classic Signature, Premium, Compare Podiums, Help Me Choose)*
  - `PROJECTS` *(Direct link to `/projects`)*
  - `RESOURCES` *(Direct link to `/resources` - replaces vague "Other Useful Links")*
  - `CLASSIC EDGE 53 ↗` *(Subtle external/sister-brand badge styling so visitors know it is Classic Concepts' machinery division)*
  - `CONTACT`
  - **Primary CTA Button:** `GET A QUOTE` (opens quick enquiry modal or `/contact#quote`).
- **New Footer ([Footer.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/layout/Footer.tsx)):**
  - Replace random small categories (`Cross`, `Lids`, `A4 T Stand`) with 4 structured B2B columns:
    1. **Products:** Podiums, Display Solutions, Signage & Branding, Boxes & Enclosures, Awards & Mementos, Furniture & Interiors, Industrial Products.
    2. **Solutions:** Custom Fabrication, Bulk Manufacturing, OEM Manufacturing, Industry Solutions (`/industries`).
    3. **Company:** About Us, Infrastructure, Clients, Certificates, Projects, Classic Edge 53 Machinery, Contact.
    4. **Resources & Direct Contact:** Product Catalogues (PDF), FAQs, Care Guides, Factory Address, Phone, Email, WhatsApp QR/Chat.
  - Also fix `[browser]` console aspect-ratio warning on `/logo.png` in Header/Footer (`width: "auto"` / `height: "auto"`).

#### 1.4 Spelling, Naming & Factual Consistency Audit
- **Database & Seed / Content Cleanup Script (`scripts/cleanup-spelling-and-facts.ts`):**
  - `"Enclosers"` -> `"Enclosures"`
  - `"Acrylic Momentos"` / `"Momento"` -> `"Acrylic Mementos"` / `"Memento"`
  - `"CC Acylic Podium"` -> `"Classic Concepts Acrylic Podiums Catalogue 2026"`
  - `"Signages"` -> `"Acrylic Signage"`
  - `"Key Chains"` -> `"Keychains"`
  - `"Paper Weight"` -> `"Paperweights"`
  - `"Acrylic Podium"` (nav/headings) -> `"Acrylic Podiums"`
  - `"Corporate sales Manager"` -> `"Corporate Sales Manager"` (title-case standardization across `TeamMember.position`).
- **Founding Year & Location Accuracy:**
  - Replace `"20+ Years"` / `"Over Two Decades"` across [Hero.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/Hero.tsx), [AboutSnippet.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/AboutSnippet.tsx), `/about`, [layout.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/layout.tsx) metadata/JSON-LD, [CustomerConciergeModal.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/ai/CustomerConciergeModal.tsx), and [ai-context.ts](file:///c:/Users/DELL/Desktop/classicconcepts/src/lib/ai-context.ts) with **"Since 2008"** / **"Established 2008 | 16,000 Sq. Ft. Manufacturing Facility"**.
  - Fix default fallback address/map in [contact/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/contact/page.tsx) (lines 32 & 114 currently fallback to Mumbai/Vasai instead of Secunderabad / Hyderabad Head Office & Factory).

---

### Phase 2: "Industries We Serve" & "Custom Acrylic Fabrication" Pillars (`🔴 Must Priority`)

#### 2.1 Build `/industries` Index & Upgrade `/industries/[slug]` Landing Pages
- **10 Initial Flagship Industries:**
  1. Corporate & Offices
  2. Education (Schools, Colleges & Universities)
  3. Hospitals & Healthcare
  4. Hotels & Hospitality
  5. Retail & Visual Merchandising
  6. Restaurants & Food Service
  7. Pharmaceutical
  8. Aerospace, Defence & Engineering *(key B2B capability page)*
  9. Churches & Religious Institutions
  10. Events, Exhibitions & Advertising
- **Schema Enhancement (`Industry` model in [schema.prisma](file:///c:/Users/DELL/Desktop/classicconcepts/prisma/schema.prisma)):**
  - Add `heroImageUrl String?` (environment/application image, distinct from white-background product photos), `shortIntro String?`, `solutionGroupsJson String?` (JSON array of `{ title: string, items: string[] }`, e.g., *Wayfinding & Signage*, *Reception & Admin*, *Patient Areas*, *Equipment Covers*), and `sortOrder Int @default(0)`.
- **Page Template (`/industries/[slug]`):**
  1. **Breadcrumb:** `Home > Industries > Hospitals & Healthcare`
  2. **Environment Hero Banner:** *"Acrylic Solutions for Hospitals & Healthcare"* + layman 2-sentence introduction.
  3. **Solution Groups Grid:** 3 to 4 visual cards showing everyday problems solved in that sector.
  4. **6–8 Recommended Products:** Dynamically queried from the single master `Product` table via `industries: { some: { slug } }` (zero product duplication).
  5. **"View All Products for This Industry" Button:** Routes to `/shop?industry=<slug>` with the industry filter pre-selected across all categories.
  6. **"Cannot Find What You Need?" Custom CTA Strip:** Buttons for `WhatsApp Us`, `Send Drawing / Photo`, and `Request Quote`.

#### 2.2 Build Dedicated `/custom-fabrication` Page
- **Purpose:** Convert high-ticket B2B, OEM, institutional, and industrial buyers whose requirement is not an off-the-shelf catalog SKU.
- **Page Structure:**
  1. **Hero:** *"Custom Acrylic Fabrication & OEM Manufacturing"* - 16,000 sq. ft. in-house facility, prototype-to-bulk capability, serving India & global markets since 2008.
  2. **10 Visual Capability Blocks** (editable via `EditableText` / `EditableImage` + linked to `Machinery` showcase):
     - Laser Cutting | CNC Routing | Diamond Edge Polishing | Precision Acrylic Bending | UV Flatbed Printing | Bonding & Assembly | Prototype Development | Custom Engineering | Bulk Production | OEM Manufacturing.
  3. **"How Custom Orders Work" in 4 Simple Layman Steps:**
     - *1. Share your photo, rough sketch, or CAD file -> 2. Material & thickness advice + quick quote -> 3. Sample / prototype approval -> 4. Factory production & safe crated delivery.*
  4. **Conversion Block:** *"Have a drawing, photograph or idea? Send it to us on WhatsApp ->"* (pre-filled WhatsApp message: `"Hi Classic Concepts, I have a custom acrylic requirement. I would like to share the drawing/photo."`) + inline Enquiry Form supporting drawing/photo/PDF upload!

---

### Phase 3: Homepage 13-Block Restructuring & Copy Simplification (`🟠 High Priority`)

Update [src/app/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/page.tsx) and `src/components/home/*` to explain what Classic Concepts manufactures within **5 seconds** in plain layman language:

1. **01 - Hero ([Hero.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/Hero.tsx)):**
   - Replace generic *"Elevate Your Space with Premium Acrylic Craftsmanship"* with clear positioning:
     - **Headline:** *"India's Specialist Acrylic Products & Custom Fabrication Manufacturer"*
     - **Sub-strip:** *"Podiums • Displays • Signage • Industrial Components • Furniture • Custom Acrylic Solutions"*
     - **Trust Line:** *"16,000 Sq. Ft. Manufacturing Facility | Since 2008 | Serving India & International Markets"*
     - **Two Primary Buttons:** `Explore Products` (`/shop`) + `Discuss Custom Requirement` (`/custom-fabrication` or WhatsApp/Quote).
     - **Prominent Search Bar:** *"What are you looking for? Search products, applications or industries..."*
2. **02 - Key Numbers Strip:** `Since 2008` | `16,000 Sq. Ft. Facility` | `188+ Products` | `Pan-India Supply` | `International Exports`.
3. **03 - Main Product Categories Grid (8–12 Visual Cards):** Representative photo + Category Name + 1-line plain description + `View Products ->` + `View All Products` button.
4. **04 - Custom Acrylic Fabrication Spotlight:** *"What can we manufacture for you?"* visual highlight + direct link to `/custom-fabrication` & WhatsApp drawing handoff.
5. **05 - Industries We Serve (6–8 Major Sectors):** Application-photo cards (`Healthcare`, `Education`, `Corporate`, `Retail`, `Hospitality`, `Aerospace & Engineering`, `Churches`, `Events`) + `View All Industries`.
6. **06 - Featured Acrylic Podiums:** 6 best-selling models across Essential, Signature & Premium ranges + `Explore All 27 Podiums` & `Help Me Choose`.
7. **07 - Manufacturing Capability ([HowWeDoIt.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/HowWeDoIt.tsx)):** Real factory machines, processes & factory video.
8. **08 - Rewrite "Why Choose Us" ([WhyChooseUs.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/WhyChooseUs.tsx)):**
   - Replace generic *Competitive Pricing / Quality Products / Value for Money* with 8 concrete manufacturer advantages:
     1. **In-House Manufacturing** (16,000 sq. ft. factory)
     2. **Advanced Machinery** (Laser, CNC, diamond polishing, bending & UV printing)
     3. **Custom Design Capability** (From rough sketch or drawing to finished product)
     4. **High-Precision Finishing** (Smooth, glass-clear polished edges)
     5. **Single Piece to Bulk Volume** (1 prototype to 1,000+ rollout units)
     6. **Safe Pan-India & Export Delivery** (Protective foam & wooden crate packing)
     7. **Dedicated Sales Support** (Fast WhatsApp & phone guidance)
     8. **Proven Multi-Industry Experience** (Corporate, aerospace, healthcare, hotels, colleges & retail)
9. **09 - Featured Projects / Case Studies:** 4–6 real completed custom jobs.
10. **10 - Curated Trusted Clients ([Clients.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/Clients.tsx)):**
    - Instead of scrolling 100+ logos sequentially on the homepage, feature **20–30 top household names** (e.g., *Tata, Google, ISRO, L&T, KIMS, AIG, ITC Hotels, Novotel, Radisson, Sony, Philips, Asian Paints, Aurobindo, IIT Hyderabad, Mahindra University*) with heading **"Trusted by 1,000+ Businesses"** and button `View All Clients ->` (`/about/clients`).
11. **11 - Plain-Language About Snippet ([AboutSnippet.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/AboutSnippet.tsx)):**
    - Replace dated phrases (*"ace team of highly qualified engineers"*, *"benevolent clients and customers"*) with clear, factual everyday English.
12. **12 - Certifications Strip & Online Storefronts ([AvailableOnPlatforms.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/home/AvailableOnPlatforms.tsx)).**
13. **13 - Final CTA:** *"Have an idea, sketch, or bulk requirement? Let us manufacture it for you."*

---

### Phase 4: Podiums Section Transformation (`inputs.txt` 20-Point Spec - `🟠 High Priority`)

Transform [src/app/podiums/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/podiums/page.tsx) from a flat product grid into a **13-section flagship category-selling experience**:

1. **Strong Opening Hero:** *"Acrylic Podiums & Lecterns - Designed. Manufactured. Finished in India."* + plain-language intro explaining 27 original models across 3 ranges + custom logo branding. (Use defensible positioning like *"One of India's Leading Acrylic Podium Manufacturers"* unless documentary proof is attached for *"India's Largest"*).
2. **Trust Strip:** `Since 2008 | 27 Original Models | 5-Year Warranty | Made in India | Custom Logo Branding`.
3. **Legally Accurate Design Protection Strip:**
   - Per the Indian Designs Act 2000, replace any casual *"Patented & Copyrighted"* wording with:
     - **"Original Classic Concepts Designs | Protected through Registered Industrial Design Rights"** (using *"Selected podium designs..."* or *"All 27 podium models..."* once certificate numbers are matched).
   - Add a subtle `Registered Design` badge on protected podium cards and display `Design Registration No.: ______` on the podium detail page where applicable.
4. **3-Range Layman Comparison Table (Above the Grid):**
   - **Essential Podiums:** *Schools, training rooms, smaller venues* -> *Practical & budget-friendly*.
   - **Classic Signature Podiums:** *Churches, colleges, corporate offices, events* -> *Most popular signature designs*.
   - **Premium Podiums:** *Auditoriums, luxury hotels, flagship stages* -> *Heavy-duty statement design & finish*.
5. **Interactive "Help Me Choose a Podium" Finder (4 Quick Clicks):**
   - Filter by: **Where will it be used?** (*Church / School & College / Corporate / Hotel / Event*) + **Budget** (*Under ₹25k / ₹25k–50k / ₹50k+*) + **Logo Branding Required?** (*Yes / No*) + **Style / City** -> instantly highlights the top 3 matching podiums!
6. **Side-by-Side 3-Podium Comparison Tool:**
   - Allow buyers to tick `"Compare"` on up to 3 podium cards (e.g., `CCP053 vs CCP063 vs CCP107`) to compare Range, Price, Height, Width, Reading Top Size, Acrylic Thickness, Weight, Wheels, Logo Option, LED Lighting, and Best Suited For in a clean modal/drawer.
7. **Podium Card Refinements:**
   - Show Model Code (`CCP053`) + Descriptive Name (`Classic Signature Acrylic Podium`) + Range label.
   - Replace loud red `"Up to 45% discount"` pills on flagship podiums with dignified pricing (`MRP ₹42,000` struck through + `Special Price ₹23,100` or `₹23,100 onwards`).
   - Show trust micro-badges: `Registered Design` • `Custom Logo Available` • `Made in India`.
   - Replace `"In stock"` with `"Ready / Made to Order"` or `"Dispatch in 3–5 Working Days"`.
   - Buttons: `View Details` + `Get Quote` (remove `"Add"` / `"Add Enquire"`).
8. **Below-Grid Category-Selling Sections on `/podiums`:**
   - **Why Classic Concepts Podiums?** (Original Designs, CNC/Laser Precision, Smooth Polished Edges, Strong Industrial Bonding, Custom Logo Integration, Since 2008, 5-Year Warranty, Safe All-India Crated Delivery).
   - **Podiums in Real Installations:** 6 environment photos (*Church, College Auditorium, Corporate Stage, Hotel Banquet, Event Stage, Government Hall*).
   - **Custom Branding Options Integrated Directly:** Show *UV Printed Color Logo, Frosted Laser Engraving, 3D Acrylic Crest, College/Church/Company Emblem* + `Share Your Logo on WhatsApp / Upload Logo` (instead of forcing users to hunt for a separate "Podium Logos" product).
   - **Safe Packaging & Nationwide Delivery:** Explain foam + wooden crate protection (with crate photo placeholder editable via `EditableImage`).
   - **5-Year Podium Warranty Breakdown:** Clear two-column layman box showing **What Is Covered** (manufacturing workmanship, structural bonding/joints, non-yellowing cast acrylic clarity) vs **What Is Not Covered** (accidental drops/impact, rough-scrubber/chemical scratches, post-delivery transit mishandling, unauthorized alterations).
   - **Podium FAQs + Final Expert CTA.**

---

### Phase 5: Product Cards, Category Pages & Individual Product Detail Pages (`🟠 High Priority`)

1. **Category Page Format (`/shop/c/[slug]` & `/shop`):**
   - Clean Breadcrumb (`Home > Products > Display Solutions`).
   - **"All Product Categories" Quick Switcher** (dropdown/drawer on mobile & desktop so buyers switch categories in 1 click without hitting Back).
   - **Horizontally Scrollable Same-Page Filter Pills** (`All | Counter Displays | Floor Displays | QR Stands | Brochure Holders | ...` on mobile & desktop, filtering instantaneously without page reload or nested URLs).
   - **2-Column Grid on Mobile** (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) so mobile shoppers scan products effortlessly.
   - Bottom **"Cannot Find What You Need? Share Your Requirement"** CTA block.
2. **Product Card Upgrade ([ProductCard.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/shop/ProductCard.tsx)):**
   - Display: Clean Image -> Category / Range Tag -> Product Name -> Model/SKU Code -> Starting Price / `Price on Request` -> `"Custom Sizes Available"` subtle tag -> Buttons: `View Details` + `Get Quote` / `Enquire Now` (keep optional Cart icon secondary only where online checkout applies, or make WhatsApp/Quote primary).
   - Pre-fill product WhatsApp button cleanly: `"Hi Classic Concepts, I am interested in [Product Name] ([SKU]). Please share price and details."`
3. **Individual Product Page Upgrade ([src/app/shop/p/[slug]/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/shop/p/%5Bslug%5D/page.tsx)):**
   - **Layman "What is it?" Summary:** 1–2 simple sentences right under the title, followed by scannable bullet points.
   - **Structured Specifications Table:** Overall Size, Acrylic Thickness, Material, Finish, Colour, Printing/Branding, Wheels/Accessories (if applicable).
   - **"Ideal For" Pills:** Clickable industry tags (`Churches | Colleges | Hotels | Hospitals | Retail`).
   - **Customization Strip:** `Logo | Custom Size | Colour | UV Printing | LED` + **"Need a Custom Size or Logo? WhatsApp Us ->"**.
   - **Lead Time, Safe Shipping & Warranty Info Strip** right below the primary CTA buttons to eliminate repetitive buyer hesitation.
   - **Related Products Grid** (4 matching items from the same category).

---

### Phase 6: Supporting Corporate Pages (`🟡 Medium Priority`)

1. **Clients Page Grouped by Industry ([src/app/about/clients/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/about/clients/page.tsx)):**
   - Add `industrySector String?` and `isFeatured Boolean @default(false)` to `Client` in [schema.prisma](file:///c:/Users/DELL/Desktop/classicconcepts/prisma/schema.prisma).
   - Organize `/about/clients` with sector filter tabs / grouped sections: *Aerospace & Defence, Healthcare, Education, Hotels & Hospitality, Pharma, Engineering & Manufacturing, IT & Corporate, Retail, Government, Events & Media*.
2. **Projects / Case Studies (`/projects` - Net-New):**
   - Add `Project` model (`title`, `slug`, `clientOrIndustry`, `requirement`, `solution`, `material`, `process`, `quantity`, `imagesJson`, `industryId?`, `isFeatured`, `sortOrder`) + Admin CRUD (`/admin/projects`) + public `/projects` showcase.
3. **Certificates vs Company Registrations ([src/app/about/certificates/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/about/certificates/page.tsx)):**
   - Add `docType String @default("certification")` (`"certification"` vs `"registration"`) to `Certificate` in [schema.prisma](file:///c:/Users/DELL/Desktop/classicconcepts/prisma/schema.prisma).
   - Split the page into two clear sections:
     - **Section A: Quality Certifications & Design Rights** (*ISO 9001:2015, Quality Accreditations, Registered Design Certificates*).
     - **Section B: Statutory Company Registrations** (*GST, Udyam MSME, Certificate of Incorporation, IEC Importer-Exporter Code, Labour Licence*).
4. **Resources & Catalogues Cleanup ([src/app/resources/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/resources/page.tsx)):**
   - Add `fileSizeLabel String?` (e.g., `"8.5 MB"`) and `updatedLabel String?` (e.g., `"Updated October 2026"`) to `Resource` in [schema.prisma](file:///c:/Users/DELL/Desktop/classicconcepts/prisma/schema.prisma).
   - Display clean metadata badge: `PDF • 8.5 MB • Updated 2026` and rename catalogues professionally (*Classic Concepts Acrylic Podiums Catalogue 2026*, *Acrylic Furniture Collection 2026*, *Awards & Mementos Catalogue 2026*, *Complete Acrylic Products Catalogue 2026*).
5. **Contact Page Simplification ([src/app/contact/page.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/app/contact/page.tsx) & [ContactForm.tsx](file:///c:/Users/DELL/Desktop/classicconcepts/src/components/ContactForm.tsx)):**
   - Lead with 4 crystal-clear action cards: **1. General Sales (Call)**, **2. WhatsApp (Chat Now)**, **3. Email (`sales@classicconcepts.in`)**, **4. Visit Our Factory (Google Maps - Secunderabad/Hyderabad)**.
   - Add file/drawing upload support (`Send Drawing / Photo`) to the enquiry form so custom fabrication buyers can attach a sketch/PDF/photo directly.
   - Move individual team member cards into a clean secondary/expandable section: *"Need specialised help? Meet Our Sales & Engineering Team"* with standardized role capitalization.

---

## 5. Summary of Database (`prisma/schema.prisma`) Additions Needed

All proposed UX changes preserve existing data and only require additive, non-destructive columns/models:

1. **`Category`**: `sortOrder Int @default(0)`, `shortDescription String?` (1-line card summary).
2. **`Product`**: `subType String?` (same-page filter tab label), `dispatchInfo String?` (e.g., `"Ready / Made to Order"`), `isRegisteredDesign Boolean @default(false)`, `designRegistrationNo String?`, `warrantyLabel String?`, `customizable Boolean @default(true)`.
3. **`Industry`**: `heroImageUrl String?`, `shortIntro String?`, `solutionGroupsJson String?`, `sortOrder Int @default(0)`.
4. **`Client`**: `sector String?`, `isFeatured Boolean @default(false)`, `sortOrder Int @default(0)`.
5. **`Certificate`**: `category String @default("certification")` (`"certification"` | `"registration"`).
6. **`Resource`**: `fileSize String?`, `updatedLabel String?`.
7. **`Project`** *(New Model)*: `id`, `title`, `slug`, `clientOrSector`, `requirement`, `solution`, `material`, `process`, `quantity`, `coverImage`, `galleryJson`, `industryId`, `isFeatured`, `sortOrder`.
8. **`Enquiry`**: `attachmentUrl String?` (optional drawing/photo upload for custom fabrication quotes).

---

## 6. Recommended Execution Roadmap

1. **Step 1 - Schema & Data Hygiene Migration**: Add additive Prisma fields, hide 0-product categories automatically, fix all spelling typos (`Enclosures`, `Mementos`, `Acrylic Podiums`, `Keychains`, `Paperweights`), fix `"Since 2008"` & Hyderabad factory defaults, and run the 50+ -> 12 Main Categories + `subType` migration script with 301 slug redirects.
2. **Step 2 - Navigation, Footer & Product Cards**: Ship the new B2B Header (`PRODUCTS`, `INDUSTRIES`, `CUSTOM FABRICATION`, `ACRYLIC PODIUMS`, `PROJECTS`, `RESOURCES`, `CLASSIC EDGE 53 ↗`, `GET A QUOTE`), 4-column Footer, `Get Quote / Enquire Now` buttons, and 2-column mobile grids with horizontal same-page filter tabs.
3. **Step 3 - Custom Fabrication & Industry Landing Pages**: Launch `/custom-fabrication` (with WhatsApp + drawing upload) and `/industries` + `/industries/[slug]` (10 flagship sectors with Solution Groups & dynamic master product feeds).
4. **Step 4 - Podiums 13-Section Flagship Upgrade**: Add Range Comparison Table, Registered Design IP strip/badges, *"Help Me Choose"* 4-step podium selector, 3-Model Side-by-Side Comparison Tool, Custom Logo section, Safe Crated Packaging, and 5-Year Warranty breakdown, plus upgraded Individual Product Detail pages.
5. **Step 5 - Homepage 13-Block Re-Ordering & Corporate Pages**: Update Homepage Hero/Why Choose Us/20–30 Featured Clients, group `/about/clients` by industry, split `/about/certificates` into Certifications vs Registrations, polish `/resources` metadata, simplify `/contact`, and launch `/projects` Case Studies.

---

## 7. Quick Decisions to Confirm Before Implementation

1. **Founding Year Wording:** Should we standardize everywhere on **"Since 2008"** (e.g., *"Manufacturing Excellence Since 2008"*), or is there an earlier group founding year you prefer cited?
2. **Podium Registered Designs:** Should we use *"Selected podium designs are protected through registered industrial design rights"* for now (safest legally), or are all 27 active podium models individually registered with Design Numbers ready to display?
3. **Cart ("Add") vs Enquiry ("Get Quote / Enquire Now"):** Would you like to replace the `"Add"` cart button on product cards with `"View Details"` + `"Get Quote"` across all products (keeping Enquiry/WhatsApp as the primary B2B conversion flow), or keep `"Add to Quote List"` as a secondary option?
