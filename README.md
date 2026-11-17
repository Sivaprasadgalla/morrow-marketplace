# Morrow Marketplace

Morrow is an editorial multi-vendor e-commerce platform built for independent design studios and artisan makers. It combines a refined editorial aesthetic with robust multi-tenant vendor operations, administrator controls, Cloudinary asset isolation, resilient checkout with Razorpay, and end-to-end MongoDB persistence.

---

## Highlights & Features

### 🛍️ Editorial Public Storefront
* **Curated Shopping Experience**: Fluid motion, scroll reveals, and interactive product cards styled with a warm, tactile design language.
* **Interactive Product Gallery**: Compact, responsive image showcase with hover zoom, multi-angle thumbnail filmstrips, image counters, and fullscreen keyboard-navigated lightbox modals.
* **Dedicated RESTful Category Pages**: Clean dynamic routing (`/category/homeware`, `/category/furniture`, `/category/lighting`, `/category/decor`, `/category/textiles`) with server-side metadata and breadcrumbs.
* **Persistent Bag & Wishlist**: Client-synchronized carts with real-time stock validation and saved pieces shelf.

### 💳 Resilient Checkout & Order Confirmation
* **Full-Page Security Loader**: Branded backdrop blur overlay guiding buyers through item reservation, payment gateway handshakes, and bank signature verification.
* **Dedicated Order-Placed Receipt (`/order-placed/[id]`)**: Confirmation receipt supporting lookups by internal ID or human-readable order number (`MOR-XXXXXXXX`).
* **Payment Failure & "Pay Later" Protection**:
  * Unfinished or cancelled payments preserve orders in `awaiting_payment` rather than dropping the sale.
  * Buyers can retry payment immediately on the receipt page or later through their **Orders** tab in `/account`.
* **Razorpay Gateway Integration**: Server-side order creation, HMAC signature verification, webhook processing, and built-in demo simulator fallback.

### 🎨 Vendor Studio & Cloudinary Media Manager
* **Vendor-Isolated Cloudinary Folders**: Studio photography is organized automatically into Cloudinary folders per vendor (`morrow/vendors/{storeSlug}`).
* **Media Library & Uploader**:
  * Drag-and-drop multi-file uploader streaming directly to Cloudinary.
  * Visual media browser with image dimensions, search, URL import, and safe deletion modals.
  * Direct image selection for primary showcase images and multi-image product galleries.
* **Studio Profile & Password Management (`/vendor/settings`)**:
  * Update studio display name, slug, contact information, and maker bio.
  * Authenticated password change with `bcrypt` salt verification and confirmation checks.
* **Catalogue & Inventory Workspace**: Product creation with draft/submit/active workflows, SKU tracking, stock adjustments, and order fulfilment tracking.

### 🛡️ Super-Admin Operations & Moderation
* **Platform Operations**: Real-time platform GMV, commission calculations, and seller-payable metrics.
* **Product Moderation**: Review vendor submissions, approve listings, or return submissions with custom reviewer notes.
* **User & Vendor Management**: Filterable data tables with search, status toggle, account actions, and audit logs.
* **Notification System**: Built-in notification bell for orders, approvals, and stock alerts.

### 💎 Zero Native Alerts & Design System
* **Bespoke Dialog Modals**: Every confirmation, deletion, and prompt uses tailored React modals (`ConfirmDialog`, `PromptDialog`) matching the design system.
* **Toast Notifications**: System-wide feedback delivers accessible top-right toast alerts for successes, warnings, and error diagnostics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) & React 19 |
| **Language** | TypeScript (Strict mode) |
| **Styling** | Tailwind CSS 4, Motion for React |
| **Database** | MongoDB & Mongoose (cached connections for serverless runtimes) |
| **Authentication** | Auth.js (NextAuth v5 beta), JWT sessions, role-based access control |
| **Media & Storage** | Cloudinary API (with demo preview fallback) |
| **Payments** | Razorpay Standard Checkout & Webhooks |
| **Email** | Resend & SMTP for transactional notifications |
| **Validation** | Zod schemas for all API payloads and inputs |

---

## Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Sivaprasadgalla/morrow-marketplace.git
cd morrow-marketplace
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your credentials:
```env
# Application & Database
MONGODB_URI=mongodb://127.0.0.1:27017/morrow_marketplace
AUTH_SECRET=your-random-auth-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...

# Media Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Resend or SMTP)
RESEND_API_KEY=re_...
EMAIL_FROM=Morrow <orders@your-domain.com>
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the storefront.

### 4. Quality Checks
```bash
npm run typecheck   # TypeScript check (0 errors)
npm run lint        # ESLint verification (0 errors)
```
