import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";

import { BRAND, SERVICES, SERVICE_AREAS } from "@/lib/nkcleanco";
import { BrandMark } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="section-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <BrandMark />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Trained, background-verified cleaning professionals serving gated communities and
            independent homes across west Hyderabad.
          </p>
          <div className="flex gap-2">
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-soft transition-smooth hover:text-primary hover:-translate-y-0.5"
            >
              <Instagram className="size-4" />
            </a>
            <a
              href="https://facebook.com"
              aria-label="Facebook"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-soft transition-smooth hover:text-primary hover:-translate-y-0.5"
            >
              <Facebook className="size-4" />
            </a>
            <a
              href={`https://wa.me/${BRAND.whatsapp}`}
              aria-label="WhatsApp"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-soft transition-smooth hover:text-primary hover:-translate-y-0.5"
            >
              <Phone className="size-4" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Services</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {SERVICES.map((service) => (
              <li key={service.id}>
                <Link
                  to="/services"
                  className="transition-smooth hover:text-primary"
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Service areas</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {SERVICE_AREAS.map((area) => (
              <li key={area} className="flex items-center gap-2">
                <MapPin className="size-3.5 text-primary" />
                {area}, Hyderabad
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Expanding to Manikonda &amp; Gandipet soon.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-ink">Get in touch</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <a
                href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 transition-smooth hover:text-primary"
              >
                <Phone className="size-4 text-primary" />
                {BRAND.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${BRAND.email}`}
                className="flex items-center gap-2 transition-smooth hover:text-primary"
              >
                <Mail className="size-4 text-primary" />
                {BRAND.email}
              </a>
            </li>
            <li className="text-xs leading-relaxed">
              Bookings open daily, 7:00 AM – 9:00 PM
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="section-shell flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
          <Link to="/admin/login" className="transition-smooth hover:text-primary">
            Team login
          </Link>
        </div>
      </div>
    </footer>
  );
}
