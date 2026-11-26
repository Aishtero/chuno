export interface ClipboardAdapter {
  writeText?: (text: string) => Promise<void>;
  execCopyFallback?: (text: string) => boolean;
}

function defaultExecCopyFallback(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/**
 * Reliable clipboard writer that works on https, http://localhost, LAN IP, and Tauri WebView2:
 * tries `navigator.clipboard.writeText`, then automatically falls back to a hidden `<textarea>`
 * + `document.execCommand('copy')`.
 */
export async function copyTextToClipboard(
  text: string,
  adapter?: ClipboardAdapter,
): Promise<boolean> {
  if (!text) return false;

  const asyncWriter =
    adapter?.writeText ??
    (typeof navigator !== 'undefined' && navigator.clipboard?.writeText
      ? (value: string) => navigator.clipboard.writeText(value)
      : undefined);

  if (asyncWriter) {
    try {
      await asyncWriter(text);
      return true;
    } catch {
      // Fall through to execCommand fallback (e.g. insecure HTTP LAN origin or denied permission)
    }
  }

  const fallback = adapter?.execCopyFallback ?? defaultExecCopyFallback;
  try {
    return Boolean(fallback(text));
  } catch {
    return false;
  }
}
