import { TableCell } from '@tiptap/extension-table-cell'
import { mergeAttributes } from '@tiptap/core'

/**
 * Custom TableCell extension that adds:
 * - formula: stores the original formula string (e.g. "=A1+B2")
 * - cellFormat: display format ('text' | 'currency' | 'date')
 */
export const FormulaTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      formula: {
        default: null,
        parseHTML: element => element.getAttribute('data-formula') || null,
        renderHTML: attributes =>
          attributes.formula ? { 'data-formula': attributes.formula } : {},
      },
      cellFormat: {
        default: 'text',
        parseHTML: element => element.getAttribute('data-cell-format') || 'text',
        renderHTML: attributes =>
          attributes.cellFormat && attributes.cellFormat !== 'text'
            ? { 'data-cell-format': attributes.cellFormat }
            : {},
      },
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})
