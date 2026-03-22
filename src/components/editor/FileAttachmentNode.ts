import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { FileAttachmentView } from './FileAttachmentView'

/**
 * Block node that embeds an uploaded file inside the TipTap document.
 * Attrs are persisted in the JSON content so files survive save/reload.
 */
export const FileAttachmentNode = Node.create({
  name: 'fileAttachment',
  group: 'block',
  atom: true,       // treated as a single unit (not editable inside)
  draggable: true,  // can be repositioned by drag within the editor

  addAttributes() {
    return {
      fileId:   { default: null },  // workpaper_files.id (null if no workpaperId)
      filePath: { default: null },  // storage path for generating signed URLs
      filename: { default: '' },
      mimeType: { default: '' },
      fileSize: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-file-attachment]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-file-attachment': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView)
  },
})
