/**
 * DialogManager - Creates HTML overlay dialogs on top of Phaser canvas
 * Perfect for showing lists, text content, clickable links, etc.
 */

export interface DialogOptions {
  title: string;
  content: string | HTMLElement;
  width?: string;
  height?: string;
  onClose?: () => void;
}

export class DialogManager {
  private static overlay: HTMLDivElement | null = null;
  private static dialog: HTMLDivElement | null = null;

  /**
   * Show a dialog overlay
   */
  static show(options: DialogOptions): void {
    // Clean up existing dialog
    this.hide();

    // Create overlay backdrop
    this.overlay = document.createElement('div');
    this.overlay.id = 'phaser-dialog-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease-out;
    `;

    // Create dialog box
    this.dialog = document.createElement('div');
    this.dialog.id = 'phaser-dialog';
    this.dialog.style.cssText = `
      background: #1e1e1e;
      border: 2px solid #ffd700;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      max-width: ${options.width || '600px'};
      max-height: ${options.height || '80vh'};
      width: 90%;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s ease-out;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h2');
    title.textContent = options.title;
    title.style.cssText = `
      margin: 0;
      color: #ffd700;
      font-size: 24px;
      font-family: Arial, sans-serif;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'transparent';
    closeBtn.onclick = () => {
      this.hide();
      options.onClose?.();
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      color: #fff;
      font-family: Arial, sans-serif;
    `;

    if (typeof options.content === 'string') {
      content.innerHTML = options.content;
    } else {
      content.appendChild(options.content);
    }

    // Assemble dialog
    this.dialog.appendChild(header);
    this.dialog.appendChild(content);
    this.overlay.appendChild(this.dialog);

    // Add to DOM
    document.body.appendChild(this.overlay);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
        options.onClose?.();
      }
    });

    // Close on ESC key
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
        options.onClose?.();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Add animations to document if not already there
    this.addAnimations();
  }

  /**
   * Hide the dialog
   */
  static hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.dialog) {
      this.dialog = null;
    }
  }

  /**
   * Check if dialog is open
   */
  static isOpen(): boolean {
    return this.overlay !== null;
  }

  /**
   * Add CSS animations if not already present
   */
  private static addAnimations(): void {
    if (document.getElementById('phaser-dialog-styles')) return;

    const style = document.createElement('style');
    style.id = 'phaser-dialog-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      #phaser-dialog-overlay::-webkit-scrollbar {
        width: 8px;
      }

      #phaser-dialog-overlay::-webkit-scrollbar-track {
        background: #2d2d2d;
      }

      #phaser-dialog-overlay::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
      }

      #phaser-dialog-overlay::-webkit-scrollbar-thumb:hover {
        background: #777;
      }
    `;
    document.head.appendChild(style);
  }
}