import { Node, mergeAttributes } from '@tiptap/core'

/**
 * インラインテキストボックスノード（左スラッシュ /○ または 右スラッシュ ○/）
 *
 * - inline + atom: 表のセル内・通常テキスト内どちらにも挿入可能
 * - 「/」は固定（削除不可）。ユーザーの入力テキストは attrs に保存
 * - 枠線なし・背景透明・文字色赤・下部に点線
 */
export const TextBoxNode = Node.create({
  name: 'textBox',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      slashPosition: { default: 'left' },  // 'left' | 'right'
      userText: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-text-box]',
        getAttrs: (el) => ({
          slashPosition: (el as HTMLElement).getAttribute('data-slash-position') ?? 'left',
          userText: (el as HTMLElement).getAttribute('data-user-text') ?? '',
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { slashPosition, userText } = node.attrs as {
      slashPosition: string
      userText: string
    }
    const display =
      slashPosition === 'left' ? `/${userText}` : `${userText}/`
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-text-box': '',
        'data-slash-position': slashPosition,
        'data-user-text': userText,
        style: [
          'display:inline-block',
          'color:#dc2626',
          'background:transparent',
          'border-bottom:1px dashed #ccc',
          'padding:0 2px',
          'line-height:inherit',
        ].join(';'),
      }),
      display,
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const attrs = node.attrs as { slashPosition: 'left' | 'right'; userText: string }

      // ── Outer wrapper ──────────────────────────────────────────────────────
      const dom = document.createElement('span')
      dom.setAttribute('data-text-box', '')
      dom.setAttribute('data-slash-position', attrs.slashPosition)
      dom.style.cssText = [
        'display:inline-flex',
        'align-items:baseline',
        'color:#dc2626',
        'background:transparent',
        'border-bottom:1px dashed #ccc',
        'padding:0 2px',
        'cursor:text',
        'vertical-align:baseline',
        'line-height:inherit',
      ].join(';')

      // ── Fixed slash (non-editable) ─────────────────────────────────────────
      const slash = document.createElement('span')
      slash.textContent = '/'
      slash.style.cssText = 'color:#dc2626;user-select:none;pointer-events:none;flex-shrink:0;'

      // ── User input ────────────────────────────────────────────────────────
      const input = document.createElement('input')
      input.type = 'text'
      input.value = attrs.userText
      input.readOnly = !editor.isEditable
      input.placeholder = '数字'

      const updateWidth = (v: string) => {
        // min 3ch so the input is always clickable, max grows with content
        input.style.width = `${Math.max(3, v.length + 1)}ch`
      }

      input.style.cssText = [
        'border:none',
        'outline:none',
        'background:transparent',
        'color:#dc2626',
        'font-size:inherit',
        'font-family:inherit',
        'padding:0',
        'margin:0',
        'line-height:inherit',
        'min-width:3ch',
      ].join(';')
      updateWidth(attrs.userText)

      // ── Sync typed text back into node attrs ───────────────────────────────
      input.addEventListener('input', () => {
        updateWidth(input.value)
        if (typeof getPos === 'function') {
          editor.commands.command(({ tr }) => {
            const pos = (getPos as () => number)()
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              userText: input.value,
            })
            return true
          })
        }
      })

      // ── Keyboard: Escape returns focus to editor ───────────────────────────
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          input.blur()
          editor.commands.focus()
        }
      })

      // ── Click on wrapper focuses the input ────────────────────────────────
      dom.addEventListener('click', (e) => {
        if (editor.isEditable) {
          e.stopPropagation()
          input.focus()
        }
      })

      // ── Assemble: position slash based on type ─────────────────────────────
      if (attrs.slashPosition === 'left') {
        dom.appendChild(slash)
        dom.appendChild(input)
      } else {
        dom.appendChild(input)
        dom.appendChild(slash)
      }

      return {
        dom,

        // Called when the node's attrs change — update input without recreating DOM
        update(updatedNode) {
          if (updatedNode.type.name !== 'textBox') return false
          const updated = updatedNode.attrs as { userText: string }
          if (input.value !== updated.userText) {
            input.value = updated.userText
            updateWidth(updated.userText)
          }
          input.readOnly = !editor.isEditable
          return true
        },

        // Let the <input> handle its own events; ProseMirror ignores them
        stopEvent(event) {
          return input.contains(event.target as globalThis.Node)
        },
      }
    }
  },
})
