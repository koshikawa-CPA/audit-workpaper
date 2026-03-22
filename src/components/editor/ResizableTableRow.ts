import TableRow from '@tiptap/extension-table-row'

/**
 * Extends the default TableRow to persist row height via data-height attribute.
 * Height is set via drag (handled in RichTextEditor) and stored in the ProseMirror doc.
 */
export const ResizableTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: el => el.getAttribute('data-height') || null,
        renderHTML: attrs => {
          if (!attrs.height) return {}
          return {
            'data-height': attrs.height,
            style: `height: ${attrs.height}; min-height: ${attrs.height}`,
          }
        },
      },
    }
  },
})
