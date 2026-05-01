import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { ContactForm } from "../../components/ContactForm";
import { contact } from "../../lib/copy";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <Hero {...contact.hero} />
      <Section>
        <ContactForm />
      </Section>
    </>
  );
}
