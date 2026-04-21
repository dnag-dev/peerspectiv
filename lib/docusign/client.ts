// docusign-esign ships without TypeScript declarations. We defer the require
// to runtime inside the real-API branch so webpack doesn't try to bundle the
// SDK's dynamic internals during dev builds (it uses `require('ApiClient')`
// with a bare module name that webpack can't statically resolve).

export interface CreateEnvelopeParams {
  signerEmail: string;
  signerName: string;
  companyName: string;
  serviceAgreementText: string;
  baaText: string;
  contractId: string;
}

/**
 * Creates and sends a DocuSign envelope containing the Service Agreement
 * and the BAA as two separate documents with signature + date tabs on each.
 *
 * Falls back to a mock envelope ID when DOCUSIGN_ACCESS_TOKEN is missing or
 * is a placeholder, so the prototype remains runnable without real credentials.
 */
export async function createAndSendEnvelope(
  params: CreateEnvelopeParams
): Promise<{ envelopeId: string }> {
  const token = process.env.DOCUSIGN_ACCESS_TOKEN;

  if (!token || token === '' || token.startsWith('stub')) {
    console.warn(
      '[DocuSign] Mock mode — no real API call. Set DOCUSIGN_ACCESS_TOKEN to enable.'
    );
    return {
      envelopeId: `mock_${Date.now()}_${params.contractId.slice(0, 8)}`,
    };
  }

  // Deferred import — only loaded when real DocuSign creds are configured.
  
  const docusign: any = eval("require")('docusign-esign');

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH!);
  apiClient.addDefaultHeader('Authorization', `Bearer ${token}`);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const envelope = {
    emailSubject: `Action Required: Peerspectiv Services Agreement — ${params.companyName}`,
    emailBlurb:
      'Please review and sign the attached Peer Review Services Agreement and Business Associate Agreement. This must be completed before services can begin.',
    documents: [
      {
        documentBase64: Buffer.from(params.serviceAgreementText).toString(
          'base64'
        ),
        name: 'Peer Review Services Agreement',
        fileExtension: 'txt',
        documentId: '1',
      },
      {
        documentBase64: Buffer.from(params.baaText).toString('base64'),
        name: 'Business Associate Agreement (HIPAA BAA)',
        fileExtension: 'txt',
        documentId: '2',
      },
    ],
    recipients: {
      signers: [
        {
          email: params.signerEmail,
          name: params.signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                xPosition: '100',
                yPosition: '700',
              },
              {
                documentId: '2',
                pageNumber: '1',
                xPosition: '100',
                yPosition: '700',
              },
            ],
            dateSignedTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                xPosition: '350',
                yPosition: '700',
              },
              {
                documentId: '2',
                pageNumber: '1',
                xPosition: '350',
                yPosition: '700',
              },
            ],
          },
        },
      ],
    },
    status: 'sent',
    eventNotification: {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/docusign`,
      loggingEnabled: 'true',
      envelopeEvents: [
        { envelopeEventStatusCode: 'completed' },
        { envelopeEventStatusCode: 'declined' },
        { envelopeEventStatusCode: 'voided' },
      ],
    },
  };

  const result = await envelopesApi.createEnvelope(
    process.env.DOCUSIGN_ACCOUNT_ID!,
    { envelopeDefinition: envelope as any }
  );

  return { envelopeId: result.envelopeId! };
}
