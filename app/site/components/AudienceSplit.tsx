import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";

export function AudienceSplit({
  fqhc,
  firms,
}: {
  fqhc: { title: string; body: string; href: string };
  firms: { title: string; body: string; href: string };
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AudienceCard icon={Building2} {...fqhc} />
      <AudienceCard icon={Users} {...firms} />
    </div>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: typeof Building2;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-ink-100 bg-paper-surface p-8 transition-all hover:border-cobalt-200 hover:shadow-md"
    >
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-cobalt-50 text-cobalt-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xl font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm text-ink-600">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cobalt-700 group-hover:gap-2">
        Learn more <ArrowRight className="h-4 w-4 transition-all" />
      </span>
    </Link>
  );
}
