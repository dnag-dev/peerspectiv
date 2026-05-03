/**
 * Phase 3.4 — Persona visibility for canonical reports.
 *
 * Server-side gate. Throws on mismatch — caller maps to 403. Never trust
 * client-supplied role/scope; resolve `currentUser` from the request session.
 *
 * Visibility matrix:
 *   per_provider           admin: all     client: own company  peer: own reviews   credentialer: 403
 *   question_analytics     admin: all     client: own company  peer: 403           credentialer: 403
 *   specialty_highlights   admin: all     client: own company  peer: 403           credentialer: 403
 *   provider_highlights    admin: all     client: own company  peer: 403           credentialer: 403
 *   quality_certificate    admin: all     client: own company  peer: 403           credentialer: 403
 *   reviewer_scorecard     admin: all     client: 403          peer: own only      credentialer: 403
 */

export type ReportType =
  | 'per_provider'
  | 'question_analytics'
  | 'specialty_highlights'
  | 'provider_highlights'
  | 'quality_certificate'
  | 'reviewer_scorecard';

export type Role = 'admin' | 'client' | 'peer' | 'credentialer';

export interface ReportScope {
  companyId?: string;
  peerId?: string;
  resultId?: string;
  /**
   * For per_provider when the resultId belongs to another peer/company,
   * callers may pre-resolve the owning company/peer and pass them here so
   * the guard can check ownership without re-fetching.
   */
  resultCompanyId?: string;
  resultPeerId?: string;
}

export interface CurrentUser {
  companyId?: string;
  peerId?: string;
}

export class ReportAccessError extends Error {
  readonly code = 'FORBIDDEN';
  constructor(message: string) {
    super(message);
    this.name = 'ReportAccessError';
  }
}

function deny(reason: string): never {
  throw new ReportAccessError(`Forbidden: ${reason}`);
}

export function assertReportAccess(
  role: Role,
  type: ReportType,
  scope: ReportScope,
  currentUser: CurrentUser
): void {
  // admin: all
  if (role === 'admin') return;

  // credentialer: never any report
  if (role === 'credentialer') {
    deny(`credentialer cannot access ${type}`);
  }

  if (role === 'client') {
    if (type === 'reviewer_scorecard') deny('client cannot access reviewer_scorecard');
    if (!currentUser.companyId) deny('client missing companyId');
    // For per_provider the client must own the result's company (or be
    // requesting their own company by the requested companyId).
    if (type === 'per_provider') {
      const owner = scope.resultCompanyId ?? scope.companyId;
      if (!owner) deny('per_provider requires companyId or resultCompanyId');
      if (owner !== currentUser.companyId) {
        deny(`client ${currentUser.companyId} cannot access company ${owner}`);
      }
      return;
    }
    // For all other client-allowed types: companyId must equal user's company.
    if (!scope.companyId) deny(`${type} requires companyId`);
    if (scope.companyId !== currentUser.companyId) {
      deny(
        `client ${currentUser.companyId} cannot access company ${scope.companyId}`
      );
    }
    return;
  }

  if (role === 'peer') {
    if (
      type === 'question_analytics' ||
      type === 'specialty_highlights' ||
      type === 'provider_highlights' ||
      type === 'quality_certificate'
    ) {
      deny(`peer cannot access ${type}`);
    }
    if (!currentUser.peerId) deny('peer missing peerId');
    if (type === 'reviewer_scorecard') {
      // peer = own only. If a peerId is requested, it must match.
      if (scope.peerId && scope.peerId !== currentUser.peerId) {
        deny(`peer ${currentUser.peerId} cannot view scorecard for ${scope.peerId}`);
      }
      return;
    }
    if (type === 'per_provider') {
      const owner = scope.resultPeerId;
      if (owner && owner !== currentUser.peerId) {
        deny(`peer ${currentUser.peerId} cannot access result owned by ${owner}`);
      }
      // If owner not pre-resolved, downstream MUST verify before returning data.
      return;
    }
  }

  deny(`unhandled role/type combination: ${role}/${type}`);
}
