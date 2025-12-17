import { DialogManager } from "./DialogManager";

export function showLoadingPRDialog() {
  DialogManager.show({
    title: '🔍 Checking for neglected PRs...',
    content: `
      <div style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
        <div style="font-size: 18px; color: #ffff00;">Loading...</div>
        <div style="font-size: 14px; color: #888; margin-top: 8px;">
          Fetching PRs from GitHub
        </div>
      </div>
    `,
  });
}

export function showPRDialogError(
  error: unknown,
  onClose: () => void
) {
  DialogManager.show({
    title: '❌ Error Loading PRs',
    content: `
      <div style="text-align: center; padding: 60px 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <div style="font-size: 18px; color: #ff4444; margin-bottom: 12px;">
          Failed to load PRs
        </div>
        <div style="
          font-size: 14px;
          color: #888;
          background: rgba(255,255,255,0.05);
          padding: 12px;
          border-radius: 4px;
          margin-top: 16px;
        ">
          ${error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    `,
    onClose,
  });
}
