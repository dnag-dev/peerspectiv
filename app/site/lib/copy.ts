/**
 * Single source of truth for the marketing site copy.
 * Brand on this surface is "Peerspectiv" (no second 'e').
 * The product/app surface remains "Peerspectiv".
 */

export const brand = {
  name: 'Peerspectiv',
  legalName: 'Peerspectiv, Inc.',
  appName: 'App',
  tagline: 'Peer review without the friction.',
  email: 'hello@peerspectiv.ai',
  appUrl: 'https://app.peerspectiv.ai',
  marketingUrl: 'https://www.peerspectiv.ai',
  domain: 'www.peerspectiv.ai',
  appDomain: 'app.peerspectiv.ai',
};

export const nav = {
  primary: [
    { href: '/platform', label: 'Platform' },
    { href: '/fqhc', label: 'For FQHCs' },
    { href: '/firms', label: 'For Review Firms' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/security', label: 'Security' },
    { href: '/company', label: 'Company' },
  ],
  cta: { href: '/contact', label: 'Request a demo' },
  signIn: { href: brand.appUrl, label: 'Sign in' },
};

export const footer = {
  product: [
    { href: '/platform', label: 'Platform' },
    { href: '/fqhc', label: 'For FQHCs' },
    { href: '/firms', label: 'For Review Firms' },
    { href: '/pricing', label: 'Pricing' },
  ],
  company: [
    { href: '/company', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: '/contact', label: 'Contact' },
  ],
  trust: [
    { href: '/security', label: 'Security' },
    { href: '/security#privacy', label: 'Privacy' },
    { href: '/security#terms', label: 'Terms' },
  ],
  copyright: `© ${new Date().getFullYear()} ${brand.legalName}. All rights reserved.`,
};

export const home = {
  hero: {
    eyebrow: 'Clinical peer review, modernized',
    title: 'Peer review that actually moves.',
    sub:
      'Peerspectiv is the AI-assisted peer-review platform built for FQHCs and the review firms that serve them. Smarter assignment, cleaner scorecards, audit-ready PDFs — without the spreadsheet sprawl.',
    primary: { href: '/contact', label: 'Request a demo' },
    secondary: { href: '/platform', label: 'See the platform' },
  },
  trust: {
    title: 'Built with operators at FQHCs and the firms reviewing them.',
    items: ['HRSA-aligned', 'License-attested reviewers', 'Audit-ready PDF reports', 'SOC 2 in progress'],
  },
  audienceSplit: {
    title: 'One platform, two surfaces.',
    sub: 'Clients see their review progress. Reviewers see their queue. Admins see everything.',
    fqhc: {
      title: 'For FQHCs',
      body:
        'See compliance at a glance, get projected completion dates per batch, and download HRSA-ready PDFs the moment a batch closes.',
      href: '/fqhc',
    },
    firms: {
      title: 'For Review Firms',
      body:
        'AI-suggested reviewer assignment, license attestation snapshots on every result, and a single dashboard across all your client FQHCs.',
      href: '/firms',
    },
  },
  features: {
    title: 'What makes it different',
    triad: [
      {
        title: 'AI-assisted assignment',
        body:
          'Suggest the right reviewer based on specialty, license state, and current load. Auto-skip reviewers on PTO. Approve in one click.',
      },
      {
        title: 'License attestation, snapshotted',
        body:
          'Every submitted result captures the reviewer name, license number, and license state at the moment of submission — frozen for audit.',
      },
      {
        title: 'Audit-ready PDFs',
        body:
          'QAPI, Provider Highlights, Quality Certificate, and more — generated server-side with consistent branding and stored alongside the case.',
      },
    ],
  },
  ash: {
    eyebrow: 'Meet Ash',
    title: 'Your operations co-pilot.',
    sub:
      'Ash is the in-app assistant that knows your batches, your reviewers, and your overdue cases. Ask it anything from "who is overdue?" to "draft a status email for Hunter Health".',
    bullets: [
      'Live context: batches, reviewers, cases, settings',
      'Role-aware: admins see everything; clients only see their portfolio',
      'No hallucinated case data — Ash refuses what it can\'t verify',
    ],
  },
  problem: {
    title: 'The old way: a spreadsheet and three email threads.',
    sub:
      'Peer review at most FQHCs is run from a workbook nobody trusts, with reviewer assignments tracked in a side channel. That breaks down at scale. Peerspectiv replaces it with a single system of record.',
  },
  cta: {
    title: 'Ready to see it on your data?',
    sub: 'Pilot with one batch. We\'ll have you generating audit-ready PDFs inside two weeks.',
    primary: { href: '/contact', label: 'Request a demo' },
    secondary: { href: '/platform', label: 'Tour the platform' },
  },
};

export const platform = {
  hero: {
    eyebrow: 'Platform',
    title: 'Everything peer review needs. Nothing it doesn\'t.',
    sub:
      'A single workspace for clients, reviewers, and the firm running the program. Built on the same patterns the best operations teams already use.',
  },
  sections: [
    {
      title: 'Intake to assignment',
      body:
        'Drop a CSV or sync from your EHR. Cases land in a batch with deadlines, specialties, and any prior reviewer history. AI suggests the best reviewer match; an admin approves with one click.',
    },
    {
      title: 'Reviewer experience',
      body:
        'Reviewers see only their queue, with the patient chart, criteria scorecard, and deficiency picker on one screen. Auto-save. License attestation captured on every submit.',
    },
    {
      title: 'Client portal',
      body:
        'Clients see batch progress, projected completion date, and a per-provider compliance ring. They never see another client\'s data — ever.',
    },
    {
      title: 'Reports & audit',
      body:
        'Generate QAPI, Provider Highlights, Specialty Highlights, Question Analytics, and Quality Certificate PDFs. Save filters as named reports. Re-run on demand.',
    },
  ],
};

export const fqhc = {
  hero: {
    eyebrow: 'For FQHCs',
    title: 'HRSA-ready peer review, without the binder.',
    sub:
      'Built for the FQHC operations lead who has to defend the program at audit. Compliance is the default state, not a quarterly fire drill.',
  },
  bullets: [
    'Per-provider compliance ring updated as results land',
    'Projected completion date per batch — know when you\'ll be done',
    'Quality Certificate PDF for board / HRSA presentation',
    'Reviewer license attestations frozen on every result',
    'Tags and saved reports for repeated audit pulls',
  ],
};

export const firms = {
  hero: {
    eyebrow: 'For Review Firms',
    title: 'Run more clients with the same team.',
    sub:
      'If your firm reviews for multiple FQHCs, Peerspectiv replaces the spreadsheet, the inbox, and the side-channel reviewer chat with one system.',
  },
  bullets: [
    'AI assignment that respects specialty, license state, and load',
    'Reviewer availability blocking — no more assignments to reviewers on PTO',
    'Single admin dashboard across all client FQHCs',
    'Settings as code — default due days, alert email, invoice cadence',
    'Audit log on every case state change',
  ],
};

export const pricing = {
  hero: {
    eyebrow: 'Pricing',
    title: 'Priced to make the spreadsheet look expensive.',
    sub:
      'Two tiers. No per-reviewer seat tax. Ash is included on every plan. Talk to us if you need an enterprise contract — we won\'t make it weird.',
  },
  tiers: [
    {
      name: 'Starter',
      price: '$1,200/mo',
      blurb: 'For a single FQHC running its program in-house.',
      features: [
        'Up to 250 cases / month',
        'All reports & PDFs',
        'Reviewer attestation snapshots',
        'Ash (operations co-pilot)',
        'Email support',
      ],
      cta: { href: '/contact', label: 'Start a pilot' },
    },
    {
      name: 'Firm',
      price: 'Talk to us',
      blurb: 'For review firms serving multiple FQHC clients.',
      features: [
        'Unlimited cases',
        'Multi-client admin dashboard',
        'AI-assisted assignment',
        'Audit log + SOC 2 reports (when issued)',
        'Priority support, dedicated CSM',
      ],
      cta: { href: '/contact', label: 'Talk to sales' },
      highlighted: true,
    },
  ],
};

export const security = {
  hero: {
    eyebrow: 'Security & Compliance',
    title: 'Operationally boring, by design.',
    sub:
      'Healthcare-grade controls, written down where you can find them. SOC 2 Type II is in progress. HIPAA BAA available on request for Firm-tier customers.',
  },
  controls: [
    {
      title: 'Data isolation',
      body:
        'Every query is scoped by company. Clients only ever see their own portfolio. Reviewers only see cases assigned to them.',
    },
    {
      title: 'Encryption',
      body:
        'TLS 1.2+ in transit. AES-256 at rest via the database provider. Backups encrypted with separate keys.',
    },
    {
      title: 'Audit trail',
      body:
        'Every case state change, every reviewer assignment, every report generation is logged with actor, timestamp, and payload.',
    },
    {
      title: 'Access control',
      body:
        'Role-based access enforced in middleware AND in every API route. Admin, client, reviewer — three roles, no overlap.',
    },
  ],
};

export const company = {
  hero: {
    eyebrow: 'Company',
    title: 'Built by people who\'ve sat in your audit.',
    sub:
      'We started Peerspectiv because we watched a friend\'s FQHC fail an HRSA peer-review check on a spreadsheet error. The work mattered. The tooling didn\'t.',
  },
  values: [
    {
      title: 'Honest software',
      body:
        'No vanity metrics. No fake AI. The system tells you when it doesn\'t know — including Ash.',
    },
    {
      title: 'Clinical respect',
      body:
        'Reviewers are professionals. The reviewer surface is fast, focused, and never gets in the way.',
    },
    {
      title: 'Operator-led',
      body:
        'Every feature is shaped by an actual FQHC ops lead or review firm partner before it ships.',
    },
  ],
};

export const contact = {
  hero: {
    eyebrow: 'Get in touch',
    title: 'Tell us about your program.',
    sub:
      'Pilots start at one batch. We\'ll set you up with a dedicated environment and walk a real case through end-to-end.',
  },
  form: {
    nameLabel: 'Your name',
    emailLabel: 'Work email',
    orgLabel: 'Organization',
    roleLabel: 'Your role',
    messageLabel: 'What are you looking to solve?',
    submit: 'Request a demo',
    success: 'Got it — we\'ll be in touch within one business day.',
    error: 'Something went wrong. Email us at hello@peerspectiv.ai.',
  },
};

export const blog = {
  hero: {
    eyebrow: 'Blog',
    title: 'Notes from the program.',
    sub: 'Field notes on FQHC peer review, audit prep, and the operations underneath.',
  },
  posts: [
    {
      slug: 'why-peer-review-breaks-at-scale',
      title: 'Why peer review breaks at 250 cases per quarter',
      date: '2026-04-01',
      excerpt:
        'The spreadsheet works fine until it doesn\'t. A look at the failure modes we see most often when an FQHC crosses the 250-case threshold.',
    },
    {
      slug: 'license-attestation-101',
      title: 'License attestation 101 (and why snapshotting matters)',
      date: '2026-03-15',
      excerpt:
        'Capturing the reviewer\'s license at the moment of submission isn\'t a nice-to-have — it\'s what saves you in an audit two years later.',
    },
  ],
};
