import { Project, SyntaxKind } from 'ts-morph';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });

const RENAMES: Array<[string, string]> = [
  ['reviewers', 'peers'],
  ['reviewer', 'peer'],
  ['Reviewer', 'Peer'],
  ['Reviewers', 'Peers'],
  ['REVIEWER', 'PEER'],
  ['REVIEWERS', 'PEERS'],
  ['reviewerId', 'peerId'],
  ['reviewer_id', 'peer_id'],
  ['ReviewerSidebar', 'PeerSidebar'],
  ['ReviewerCaseSplit', 'PeerCaseSplit'],
  ['ReviewerScorecardTab', 'PeerScorecardTab'],
  ['EditReviewerModal', 'EditPeerModal'],
  ['AddReviewerModal', 'AddPeerModal'],
  ['reviewerNavItems', 'peerNavItems'],
  ['reviewersRelations', 'peersRelations'],
  ['reviewerPayouts', 'peerPayouts'],
  ['reviewer_payouts', 'peer_payouts'],
];

let renamedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  if (filePath.includes('node_modules')) continue;
  if (filePath.includes('.peerspectiv-assets')) continue;
  if (filePath.includes('supabase/migrations/')) continue;
  if (filePath.includes('drizzle/migrations/')) continue;

  for (const [oldName, newName] of RENAMES) {
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
      .filter(n => n.getText() === oldName);
    for (const id of identifiers) {
      try {
        id.rename(newName);
        renamedCount++;
      } catch (e) {
        console.warn(`Skip ${filePath}: ${oldName} -> ${newName}: ${(e as Error).message}`);
      }
    }
  }
}

(async () => {
  await project.save();
  console.log(`Renamed ${renamedCount} identifiers across the project.`);
})();
