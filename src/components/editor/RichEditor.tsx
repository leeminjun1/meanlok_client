'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

const HeaderAsCell = TableHeader.extend({
  parseHTML() {
    return [{ tag: 'th' }, { tag: 'td[data-th-cell=\"true\"]' }, { tag: 'td.th-cell' }];
  },
  renderHTML({ HTMLAttributes }) {
    const className = HTMLAttributes.class
      ? `${HTMLAttributes.class} th-cell`
      : 'th-cell';

    return [
      'td',
      {
        ...HTMLAttributes,
        class: className,
        'data-th-cell': 'true',
      },
      0,
    ];
  },
});

const EDITOR_CLASS_NAME =
  'min-h-[280px] rounded-b-md border border-t-0 border-neutral-300 p-4 text-sm focus:outline-none';
const SAFE_LINK_PATTERN = /^(?:https?:\/\/|mailto:|#|\/)/i;

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  editable?: boolean;
}

function ToolButton({
  onClick,
  label,
  active,
  disabled,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className="h-7 px-2"
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

export function RichEditor({ value, onChange, editable = true }: RichEditorProps) {
  const onChangeRef = useRef(onChange);
  const [initialContent] = useState(value);
  const lastEmittedHtmlRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const extensions = useMemo(
    () => [
      StarterKit,
      Link.configure({
        openOnClick: false,
        validate: (href) => SAFE_LINK_PATTERN.test(href),
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      HeaderAsCell,
      TableCell,
    ],
    [],
  );

  const editorProps = useMemo(
    () => ({
      attributes: {
        class: EDITOR_CLASS_NAME,
      },
    }),
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps,
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChangeRef.current(html);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    if (value === lastEmittedHtmlRef.current) {
      return;
    }

    if (editor.isFocused || editor.view.composing) {
      return;
    }

    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="h-72 rounded-md border border-neutral-300" />;
  }

  const insideTable = editor.isActive('table');

  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-t-md border border-neutral-300 bg-neutral-50 p-2">
        <ToolButton
          label="B"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editable}
        />
        <ToolButton
          label="I"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editable}
        />
        <ToolButton
          label="H1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!editable}
        />
        <ToolButton
          label="H2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editable}
        />
        <ToolButton
          label="목록"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editable}
        />
        <ToolButton
          label="번호목록"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editable}
        />
        <ToolButton
          label="코드"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={!editable}
        />
        <ToolButton
          label="링크"
          active={editor.isActive('link')}
          onClick={() => {
            const previous = editor.getAttributes('link').href as string | undefined;
            const url = window.prompt('링크 URL', previous ?? 'https://');

            if (url === null) {
              return;
            }

            if (!url) {
              editor.chain().focus().unsetLink().run();
              return;
            }

            if (!SAFE_LINK_PATTERN.test(url)) {
              toast.error('허용되지 않은 링크 형식입니다.');
              return;
            }

            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }}
          disabled={!editable}
        />
        <ToolButton
          label="표"
          onClick={() => {
            if (insideTable) {
              return;
            }

            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run();
          }}
          disabled={!editable || insideTable}
        />
        <ToolButton
          label="표 삭제"
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editable || !insideTable}
        />
        <ToolButton
          label="행+"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editable || !insideTable}
        />
        <ToolButton
          label="행−"
          onClick={() => editor.chain().focus().deleteRow().run()}
          disabled={!editable || !insideTable}
        />
        <ToolButton
          label="열+"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editable || !insideTable}
        />
        <ToolButton
          label="열−"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          disabled={!editable || !insideTable}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
