// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Editor } from './Editor'
import { useDocumentStore } from '@/lib/store/use-document-store'

afterEach(cleanup)

function resetStore() {
  useDocumentStore.setState({ document: '', engineRef: null, operationLog: [] })
}

describe('Editor — accessibility (AC4)', () => {
  beforeEach(resetStore)

  it('exposes role=textbox, aria-multiline=true and the exact Spanish aria-label required by the AC', () => {
    render(<Editor />)
    const editor = screen.getByRole('textbox', { name: 'Editor de texto colaborativo' })
    expect(editor).toHaveAttribute('aria-multiline', 'true')
  })
})

describe('Editor — typing (AC2)', () => {
  beforeEach(resetStore)

  it('typing a printable character inserts it into the document via the store', async () => {
    const user = userEvent.setup()
    render(<Editor />)
    const editor = screen.getByRole('textbox', { name: 'Editor de texto colaborativo' })

    await user.click(editor)
    await user.keyboard('hi')

    expect(editor).toHaveTextContent('hi')
    const log = useDocumentStore.getState().operationLog
    expect(log).toHaveLength(2)
    expect(log[0].type).toBe('insert')
    expect(log[0].char).toBe('h')
    expect(log[1].char).toBe('i')
  })
})

describe('Editor — deleting (AC3)', () => {
  beforeEach(resetStore)

  it('Backspace removes the last typed character from the document via the store', async () => {
    const user = userEvent.setup()
    render(<Editor />)
    const editor = screen.getByRole('textbox', { name: 'Editor de texto colaborativo' })

    await user.click(editor)
    await user.keyboard('hi')
    await user.keyboard('{Backspace}')

    expect(editor).toHaveTextContent('h')
    const log = useDocumentStore.getState().operationLog
    expect(log).toHaveLength(3)
    expect(log[2].type).toBe('delete')
  })

  it('Backspace on an empty document does not throw and does not append an operation', async () => {
    const user = userEvent.setup()
    render(<Editor />)
    const editor = screen.getByRole('textbox', { name: 'Editor de texto colaborativo' })

    await user.click(editor)
    await expect(user.keyboard('{Backspace}')).resolves.not.toThrow()
    expect(useDocumentStore.getState().operationLog).toHaveLength(0)
  })
})
