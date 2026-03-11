/**
 * Composable that provides reusable code editor behavior:
 * - Sync scroll between line numbers and textarea
 * - Tab key handling (inserts 2 spaces)
 * - Cmd/Ctrl+S to save
 *
 * Used by both ProjectsView and NginxProxyView to avoid duplication.
 */
import { ref } from 'vue';

export function useCodeEditor(onSave: () => void) {
  const lineNumbersRef = ref<HTMLElement | null>(null);
  const editorRef = ref<HTMLTextAreaElement | null>(null);

  function syncScroll() {
    if (lineNumbersRef.value && editorRef.value) {
      lineNumbersRef.value.scrollTop = editorRef.value.scrollTop;
    }
  }

  function handleKeyDown(e: KeyboardEvent, contentRef: { value: string }) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      contentRef.value =
        textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      onSave();
    }
  }

  return {
    lineNumbersRef,
    editorRef,
    syncScroll,
    handleKeyDown,
  };
}
