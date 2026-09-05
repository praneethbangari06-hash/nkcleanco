# CleanConnect Hyderabad

Build a professional, mobile-first home cleaning service booking platform called "CleanConnect" (or similar) serving Narsingi, Kokapet, and Kanapur areas in Hyderabad. This needs to look premium and trustworthy like Urban Company — not like a college project.

DESIGN DIRECTION:

- Clean, modern, minimal aesthetic with a calming color palette (soft blues/greens/white — cleanliness theme), plenty of whitespace

- Fully responsive: perfect on mobile (most users will book from phone) AND desktop

- Smooth micro-animations on buttons, cards, and page transitions

- Professional typography — clear hierarchy, readable sizes

- Trust elements: badges like "Verified Cleaners", "10+ Trained Staff", "Same Day Service"

PAGES/SECTIONS NEEDED:

1. LANDING PAGE

- Hero section: strong headline (e.g. "Professional Home Cleaning at Your Doorstep"), subheadline, big "Book Now" CTA button, hero image/illustration of cleaning

- Service area badges showing: Narsingi, Kokapet, Kanapur (visually, like location pills/tags)

- "How it works" section — 3-4 step visual process (Book → We Assign Cleaner → Cleaning Done → Rate Us)

- Services offered section with icons/cards: Home Deep Cleaning, Bathroom Cleaning, Kitchen Cleaning, Office Cleaning, Sofa/Carpet Cleaning — each with short description and starting price

- Why choose us section: trained staff, on-time guarantee, affordable pricing, eco-friendly products

- Testimonials/reviews section (placeholder content for now)

- Footer with contact info, service areas, social links

2. BOOKING PAGE (multi-step form, feels like a wizard, not a boring form)

Step 1: Select service type (cards to choose from: Home Cleaning, Deep Cleaning, Bathroom, Kitchen, Sofa/Carpet, Office)

Step 2: Enter address — house/flat number, street, and a dropdown to select area (Narsingi / Kokapet / Kanapur only — show a friendly message if someone tries other areas: "We currently serve Narsingi, Kokapet, Kanapur — expanding soon!")

Step 3: Select date and preferred time slot (morning/afternoon/evening slots as cards)

Step 4: Enter contact details — name, phone number

Step 5: Review summary — show all selected details, estimated price range, "Confirm Booking" button

Show a progress bar/stepper at top so user knows which step they're on

3. CONFIRMATION PAGE

- Big checkmark animation

- "Booking Confirmed! Our team will contact you within 30 minutes"

- Booking reference ID

- Summary of booking details

- "Book Another Service" button

4. ADMIN DASHBOARD (separate login page + dashboard)

- Simple login page (email/password) for admin

- Dashboard home: stats cards at top (Total Bookings Today, Pending, Completed, Total Revenue Estimate)

- Bookings table: columns for Customer Name, Phone, Area, Service Type, Date/Time, Status (Pending/Assigned/Completed), with status dropdown to update

- Filter/search by area and date

- Clean sidebar navigation (Dashboard, Bookings, Workers — Workers page can be placeholder "Coming Soon" for now)

TECHNICAL REQUIREMENTS:

- Use Supabase for backend/database to store bookings

- Bookings table fields: id, customer_name, phone, address, area, service_type, date, time_slot, status, created_at

- Form validation on booking flow (required fields, phone number format)

- Mobile-first responsive design, test that booking flow works smoothly on small screens with big tap-friendly buttons

- Fast loading, no clutter

Make it feel premium, trustworthy, and ready to show to a real business client today.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nkcleanco.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c890e0e1-0a46-45ea-a1a3-ec91778f334c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
