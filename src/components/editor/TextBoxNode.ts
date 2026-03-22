import { Node, mergeAttributes } from '@tiptap/core'

/**
 * テキストボックスノード
 * - 枠線なし・背景透明・文字色赤
 * - OneNoteのテキストボックスのように、本文中に赤字でコメント/注記を挿入する用途
 */
export const TextBoxNode = Node.create({
  name: 'textBox',
  group: 'block',
  content: 'paragraph+',

  parseHTML() {
    return [{ tag: 'div[data-text-box]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-text-box': '' }),
      0,
    ]
  },

  addNodeView() {
    return () => {
      const dom = document.createElement('div')
      dom.setAttribute('data-text-box', '')
      dom.style.cssText = [
        'color:#dc2626',
        'background:transparent',
        'border:none',
        'outline:none',
        'padding:2px 0',
        'min-height:1.5em',
        'cursor:text',
      ].join(';')

      const contentDOM = document.createElement('div')
      dom.appendChild(contentDOM)

      return { dom, contentDOM }
    }
  },
})
