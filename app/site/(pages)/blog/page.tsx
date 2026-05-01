import Link from "next/link";
import { Hero } from "../../components/Hero";
import { Section } from "../../components/Section";
import { blog } from "../../lib/copy";

export const metadata = { title: "Blog" };

export default function BlogIndex() {
  return (
    <>
      <Hero {...blog.hero} />
      <Section>
        <div className="space-y-6">
          {blog.posts.map((p) => (
            <article
              key={p.slug}
              className="rounded-lg border border-ink-100 bg-paper-surface p-6"
            >
              <p className="text-xs text-ink-500">{p.date}</p>
              <h3 className="mt-1 text-xl font-semibold text-ink-900">
                <Link href={`/blog/${p.slug}`} className="hover:text-cobalt-700">
                  {p.title}
                </Link>
              </h3>
              <p className="mt-2 text-sm text-ink-600">{p.excerpt}</p>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
