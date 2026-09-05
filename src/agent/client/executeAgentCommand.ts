import type {
  AgentApprovalToken,
  AgentCommandDraftRequest,
  AgentCommandPreview,
  AgentExecutionReceipt,
} from '../contracts/commandContracts';

export interface AgentCommandClientResult {
  preview: AgentCommandPreview;
  approval: AgentApprovalToken | null;
  receipt: AgentExecutionReceipt | null;
}

/**
 * Shared adapter for pointer, keyboard, screen-reader, and programmatic callers.
 * It never bypasses preview or invents approval outside the initiating action.
 */
export async function executeAgentCommand(
  request: AgentCommandDraftRequest,
  options: {
    approveIfRequired?: boolean;
    approvalReason?: string;
  } = {}
): Promise<AgentCommandClientResult> {
  const api = globalThis.window?.__MILLOS_AGENT__;
  if (!api || api.version !== 2) {
    throw new Error('MillOS agent runtime v2 is not installed.');
  }
  const command = api.draft(request);
  const preview = await api.preview(command);
  if (preview.status === 'denied') {
    return { preview, approval: null, receipt: await api.commit(preview) };
  }
  if (preview.status === 'requires-approval' && !options.approveIfRequired) {
    return { preview, approval: null, receipt: null };
  }
  const approval =
    preview.status === 'requires-approval'
      ? api.approve(
          preview.previewId,
          options.approvalReason?.trim() ||
            'Explicit human interface action approved the exact current preview.'
        )
      : null;
  return {
    preview,
    approval,
    receipt: await api.commit(preview, approval ?? undefined),
  };
}
