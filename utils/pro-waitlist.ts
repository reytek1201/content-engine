import { proWaitlistSubject, supportEmail } from "@/utils/site-metadata";

export function getProWaitlistMailtoUrl(): string {
  const params = new URLSearchParams({
    subject: proWaitlistSubject,
    body: "Hi SlidePress team — please add me to the Pro waitlist.\n\nEmail:",
  });

  return `mailto:${supportEmail}?${params.toString()}`;
}
