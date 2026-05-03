import { describe, it, expect } from 'vitest';
import {
  assertReportAccess,
  ReportAccessError,
  type ReportType,
  type Role,
} from './persona-guard';

const TYPES: ReportType[] = [
  'per_provider',
  'question_analytics',
  'specialty_highlights',
  'provider_highlights',
  'quality_certificate',
  'reviewer_scorecard',
];

const COMPANY_OWN = 'co-own';
const COMPANY_OTHER = 'co-other';
const PEER_OWN = 'peer-own';
const PEER_OTHER = 'peer-other';

function expectThrow(fn: () => void) {
  expect(fn).toThrow(ReportAccessError);
}

describe('assertReportAccess — admin', () => {
  it.each(TYPES)('admin can access %s', (type) => {
    expect(() =>
      assertReportAccess('admin', type, { companyId: COMPANY_OTHER, peerId: PEER_OTHER }, {})
    ).not.toThrow();
  });
});

describe('assertReportAccess — credentialer', () => {
  it.each(TYPES)('credentialer is denied %s', (type) => {
    expectThrow(() =>
      assertReportAccess(
        'credentialer',
        type,
        { companyId: COMPANY_OWN, peerId: PEER_OWN, resultId: 'r1' },
        { companyId: COMPANY_OWN, peerId: PEER_OWN }
      )
    );
  });
});

describe('assertReportAccess — client', () => {
  it('client can access own company for per_provider/question_analytics/specialty/provider/quality', () => {
    const allowed: ReportType[] = [
      'per_provider',
      'question_analytics',
      'specialty_highlights',
      'provider_highlights',
      'quality_certificate',
    ];
    for (const t of allowed) {
      expect(() =>
        assertReportAccess(
          'client',
          t,
          { companyId: COMPANY_OWN, resultCompanyId: COMPANY_OWN },
          { companyId: COMPANY_OWN }
        )
      ).not.toThrow();
    }
  });

  it('client is denied reviewer_scorecard', () => {
    expectThrow(() =>
      assertReportAccess('client', 'reviewer_scorecard', {}, { companyId: COMPANY_OWN })
    );
  });

  it('cross-tenant URL manipulation as Client → throws 403', () => {
    expectThrow(() =>
      assertReportAccess(
        'client',
        'provider_highlights',
        { companyId: COMPANY_OTHER },
        { companyId: COMPANY_OWN }
      )
    );
  });

  it('client cannot access per_provider for another company', () => {
    expectThrow(() =>
      assertReportAccess(
        'client',
        'per_provider',
        { resultCompanyId: COMPANY_OTHER },
        { companyId: COMPANY_OWN }
      )
    );
  });
});

describe('assertReportAccess — peer', () => {
  it('peer is denied question_analytics/specialty/provider/quality', () => {
    const denied: ReportType[] = [
      'question_analytics',
      'specialty_highlights',
      'provider_highlights',
      'quality_certificate',
    ];
    for (const t of denied) {
      expectThrow(() =>
        assertReportAccess('peer', t, { companyId: COMPANY_OWN }, { peerId: PEER_OWN })
      );
    }
  });

  it('peer can access own reviewer_scorecard', () => {
    expect(() =>
      assertReportAccess(
        'peer',
        'reviewer_scorecard',
        { peerId: PEER_OWN },
        { peerId: PEER_OWN }
      )
    ).not.toThrow();
  });

  it('peer cannot access another peer’s scorecard', () => {
    expectThrow(() =>
      assertReportAccess(
        'peer',
        'reviewer_scorecard',
        { peerId: PEER_OTHER },
        { peerId: PEER_OWN }
      )
    );
  });

  it('peer can access per_provider when resultPeerId matches', () => {
    expect(() =>
      assertReportAccess(
        'peer',
        'per_provider',
        { resultPeerId: PEER_OWN },
        { peerId: PEER_OWN }
      )
    ).not.toThrow();
  });

  it('peer cannot access another peer’s per_provider review', () => {
    expectThrow(() =>
      assertReportAccess(
        'peer',
        'per_provider',
        { resultPeerId: PEER_OTHER },
        { peerId: PEER_OWN }
      )
    );
  });
});
