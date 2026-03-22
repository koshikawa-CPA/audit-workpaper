import { Node, mergeAttributes } from '@tiptap/core'

export const WorkpaperMentionNode = Node.create({
  name: 'workpaperMention',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-workpaper-mention]',
        getAttrs: (el) => ({
          id: (el as HTMLElement).getAttribute('data-workpaper-id'),
          label: (el as HTMLElement).getAttribute('data-label'),
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-workpaper-mention': '',
        'data-workpaper-id': node.attrs.id,
        'data-label': node.attrs.label,
        class: 'workpaper-mention',
      }),
      `@${node.attrs.label}`,
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const span = document.createElement('span')
      span.setAttribute('data-workpaper-mention', '')
      span.setAttribute('data-workpaper-id', node.attrs.id || '')
      span.setAttribute('data-label', node.attrs.label || '')
      span.textContent = `@${node.attrs.label}`
      span.style.cssText = [
        'display:inline-block',
        'color:#2563eb',
        'background:#eff6ff',
        'border:1px solid #bfdbfe',
        'border-radius:4px',
        'padding:0 5px',
        'font-size:0.875em',
        'font-weight:500',
        'cursor:pointer',
        'user-select:none',
        'line-height:1.6',
        'white-space:nowrap',
      ].join(';')

      span.addEventListener('click', () => {
        if (node.attrs.id) {
          window.location.href = `/workpapers/${node.attrs.id}`
        }
      })

      return { dom: span }
    }
  },
})
