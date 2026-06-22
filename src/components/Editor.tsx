'use client'

import { useEffect, useRef } from 'react'
import { useDocumentStore } from '@/lib/store/use-document-store'
import styles from './Editor.module.css'

function getCaretIndex(root: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0
  const range = selection.getRangeAt(0)
  if (root.firstChild && range.startContainer === root.firstChild) {
    return range.startOffset
  }
  return root.textContent?.length ?? 0
}

function setCaretIndex(root: HTMLElement, index: number): void {
  const selection = window.getSelection()
  if (!selection) return
  const textNode = root.firstChild
  const range = document.createRange()
  if (textNode) {
    range.setStart(textNode, Math.min(index, textNode.textContent?.length ?? 0))
  } else {
    range.setStart(root, 0)
  }
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function Editor() {
  const document_ = useDocumentStore((s) => s.document)
  const initEngine = useDocumentStore((s) => s.initEngine)
  const insertChar = useDocumentStore((s) => s.insertChar)
  const deleteChar = useDocumentStore((s) => s.deleteChar)
  const rootRef = useRef<HTMLDivElement>(null)
  const caretRef = useRef(0)

  useEffect(() => {
    initEngine()
  }, [initEngine])

  // The store replaces the editor's textContent on every keystroke, which
  // resets the browser's native caret to 0 — it must be restored after
  // every render driven by a document change.
  useEffect(() => {
    if (rootRef.current) setCaretIndex(rootRef.current, caretRef.current)
  }, [document_])

  function syncCaret() {
    if (rootRef.current) caretRef.current = getCaretIndex(rootRef.current)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const index = caretRef.current
      if (index > 0) {
        deleteChar(index - 1)
        caretRef.current = index - 1
      }
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      insertChar(caretRef.current, '\n')
      caretRef.current += 1
      return
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      insertChar(caretRef.current, e.key)
      caretRef.current += 1
    }
    // Arrow keys / Home / End / click: let the browser move the native
    // caret, then resync via syncCaret on keyup/click.
  }

  return (
    <div
      ref={rootRef}
      className={styles.editor}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label="Editor de texto colaborativo"
      onKeyDown={handleKeyDown}
      onKeyUp={syncCaret}
      onClick={syncCaret}
    >
      {document_}
    </div>
  )
}
