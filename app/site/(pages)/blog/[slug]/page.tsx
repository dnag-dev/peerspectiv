import { notFound } from "next/navigation";
import { Section } from "../../../components/Section";
import { blog } from "../../../lib/copy";

export function generateStaticParams() {
  return blog.posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = blog.posts.find((p) => p.slug === params.slug);
  return { title: post?.title ?? "Post" };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = blog.posts.find((p) => p.slug === params.slug);
  if (!post) notFound();
  return (
    <Section>
      <article className="mx-auto max-w-3xl">
        <p className="text-xs text-ink-500">{post.date}</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink-900">
          {post.title}
        </h1>
        <p className="mt-6 text-lg text-ink-700">{post.excerpt}</p>
        <p className="mt-6 text-sm text-ink-500 italic">
          Full post coming soon. Want this in your inbox? Drop us a note via the
          contact form.
        </p>
      </article>
    </Section>
  );
}
