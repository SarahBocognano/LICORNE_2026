import type { PRWithStatus } from '../services/github.types';

/**
 * Build HTML content for displaying neglected PRs
 */
export function buildPRListHTML(prs: PRWithStatus[], timeUnit: 'hours' | 'days' = 'days'): string {
  if (prs.length === 0) {
    return `
      <div style="text-align: center; padding: 40px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
        <div style="font-size: 18px; color: #00ff00;">No neglected PRs!</div>
        <div style="font-size: 14px; color: #888; margin-top: 8px;">
          All PRs are getting attention. Great job!
        </div>
      </div>
    `;
  }

  const unitLabel = timeUnit === 'hours' ? 'h' : 'd';

  const prItems = prs.map((pr, index) => {
    const urgencyColor = getUrgencyColor(pr.status.urgency);
    
    return `
      <div style="
        background: ${getUrgencyBg(pr.status.urgency)};
        border-left: 4px solid ${urgencyColor};
        border-radius: 4px;
        padding: 12px 16px;
        margin-bottom: 12px;
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
      " 
      onmouseover="this.style.transform='translateX(4px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'"
      onmouseout="this.style.transform='translateX(0)'; this.style.boxShadow='none'"
      onclick="window.open('${pr.url}', '_blank')">
        
        <!-- PR Header -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 20px;">${pr.status.emoji}</span>
          <span style="color: #ffd700; font-weight: bold; font-size: 16px;">
            #${pr.number}
          </span>
          <span style="
            background: ${urgencyColor}; 
            color: #000; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
          ">
            ${pr.status.urgency}
          </span>
        </div>

        <!-- PR Title -->
        <div style="
          color: #fff; 
          font-size: 14px; 
          margin-bottom: 8px;
          line-height: 1.4;
        ">
          ${escapeHtml(pr.title)}
        </div>

        <!-- Status Message -->
        <div style="
          color: ${urgencyColor}; 
          font-size: 12px;
          margin-bottom: 8px;
        ">
          ${pr.status.message}
        </div>

        <!-- Metadata -->
        <div style="
          display: flex; 
          gap: 16px; 
          font-size: 11px; 
          color: #888;
        ">
          <span>⏰ ${pr.ageDays}${unitLabel} old</span>
          <span>👁️ ${pr.reviewCount} reviews</span>
          <span>💬 ${pr.commentCount} comments</span>
        </div>

        <!-- Click hint -->
        <div style="
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 11px;
          color: #4493f8;
        ">
          Click to open in GitHub →
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-size: 14px; color: #ccc; margin-bottom: 16px;">
      Found ${prs.length} neglected PR${prs.length === 1 ? '' : 's'} that need your help!
    </div>
    ${prItems}
  `;
}

/**
 * Build HTML content as a DOM element (more flexible)
 */
export function buildPRListElement(prs: PRWithStatus[], timeUnit: 'hours' | 'days' = 'days'): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = buildPRListHTML(prs, timeUnit);
  return container;
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical': return '#ff0000';
    case 'urgent': return '#ff8800';
    case 'warning': return '#ffff00';
    default: return '#00ff00';
  }
}

function getUrgencyBg(urgency: string): string {
  switch (urgency) {
    case 'critical': return 'rgba(255, 0, 0, 0.1)';
    case 'urgent': return 'rgba(255, 136, 0, 0.1)';
    case 'warning': return 'rgba(255, 255, 0, 0.1)';
    default: return 'rgba(0, 255, 0, 0.1)';
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}