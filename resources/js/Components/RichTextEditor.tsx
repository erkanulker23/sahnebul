import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Heading2,
    Heading3,
    Image as ImageIcon,
    Italic,
    Link2,
    List,
    ListOrdered,
    Minus,
    Quote,
    Redo2,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo2,
} from 'lucide-react';
import { useCallback, useEffect, type ReactNode } from 'react';
import './RichTextEditor.css';

type Props = {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
};

function ToolbarButton({
    onClick,
    active,
    disabled: btnDisabled,
    title: label,
    children,
}: Readonly<{
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    children: ReactNode;
}>) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={btnDisabled}
            title={label}
            aria-label={label}
            className={`inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded px-1.5 text-zinc-300 transition ${
                active ? 'bg-amber-500/30 text-amber-200' : 'hover:bg-zinc-700'
            } disabled:opacity-40`}
        >
            {children}
        </button>
    );
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Metin yazın…',
    className = '',
    disabled = false,
}: Readonly<Props>) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: {
                    openOnClick: false,
                    autolink: true,
                    defaultProtocol: 'https',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'max-h-[min(480px,70vh)] w-auto max-w-full rounded-lg',
                },
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: value || '',
        editable: !disabled,
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[280px] px-3 py-3 text-sm leading-relaxed text-zinc-100',
            },
        },
        onUpdate: ({ editor: ed }) => {
            onChange(ed.getHTML());
        },
    });

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        editor.setEditable(!disabled);
    }, [disabled, editor]);

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        const cur = editor.getHTML();
        if (value !== cur) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
    }, [value, editor]);

    const setLink = useCallback(() => {
        if (!editor) return;
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = globalThis.prompt('Bağlantı URL', prev || 'https://');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addImage = useCallback(() => {
        if (!editor) return;
        const url = globalThis.prompt('Görsel URL (https://…)', 'https://');
        if (!url?.trim()) return;
        editor.chain().focus().setImage({ src: url.trim() }).run();
    }, [editor]);

    if (!editor) {
        return <div className={`min-h-[300px] animate-pulse rounded-lg border border-zinc-700 bg-zinc-900 ${className}`} />;
    }

    const iconClass = 'h-4 w-4 shrink-0';

    return (
        <div className={`overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 ${className}`}>
            <div className="flex flex-wrap gap-0.5 border-b border-zinc-700 bg-zinc-800/90 px-1.5 py-1.5">
                <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} disabled={disabled} title="Kalın">
                    <Bold className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} disabled={disabled} title="İtalik">
                    <Italic className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    disabled={disabled}
                    title="Altı çizili"
                >
                    <UnderlineIcon className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} disabled={disabled} title="Üstü çizili">
                    <Strikethrough className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <span className="mx-0.5 w-px self-stretch bg-zinc-600" aria-hidden />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor.isActive('heading', { level: 2 })}
                    disabled={disabled}
                    title="Alt başlık (H2)"
                >
                    <Heading2 className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    active={editor.isActive('heading', { level: 3 })}
                    disabled={disabled}
                    title="Alt başlık (H3)"
                >
                    <Heading3 className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <span className="mx-0.5 w-px self-stretch bg-zinc-600" aria-hidden />
                <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} disabled={disabled} title="Madde işaretli liste">
                    <List className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} disabled={disabled} title="Numaralı liste">
                    <ListOrdered className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} disabled={disabled} title="Alıntı">
                    <Quote className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} disabled={disabled} title="Yatay çizgi">
                    <Minus className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <span className="mx-0.5 w-px self-stretch bg-zinc-600" aria-hidden />
                <ToolbarButton onClick={addImage} disabled={disabled} title="Görsel (URL)">
                    <ImageIcon className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={setLink} active={editor.isActive('link')} disabled={disabled} title="Bağlantı">
                    <Link2 className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={disabled || !editor.can().undo()} title="Geri al">
                    <Undo2 className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={disabled || !editor.can().redo()} title="Yinele">
                    <Redo2 className={iconClass} strokeWidth={2.25} />
                </ToolbarButton>
            </div>
            <div className="bg-zinc-900 px-1 py-0.5">
                <EditorContent editor={editor} className="sahne-tiptap-editor" />
            </div>
        </div>
    );
}
