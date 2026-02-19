/**
 * RichTextEditor - Tiptap 기반 리치 텍스트 에디터
 * 관리자 매거진 기사 작성/수정용
 *
 * 지원 서식: 볼드, 이탤릭, 밑줄, 제목(H2/H3),
 *           텍스트 정렬(좌/중/우), 불릿/번호 리스트, 이미지 삽입
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Heading2,
    Heading3,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Undo,
    Redo,
    ImagePlus,
    Loader2,
} from "lucide-react";

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    /** 이미지 파일 업로드 콜백. 업로드 후 URL 반환 (실패 시 null) */
    onImageUpload?: (file: File) => Promise<string | null>;
}

export default function RichTextEditor({ content, onChange, onImageUpload }: RichTextEditorProps) {
    const [isImageUploading, setIsImageUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            TiptapImage.configure({
                inline: false,
                allowBase64: false,
            }),
        ],
        content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    /** 이미지 파일 선택 핸들러 */
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor || !onImageUpload) return;

        setIsImageUploading(true);
        try {
            const url = await onImageUpload(file);
            if (url) {
                editor.chain().focus().setImage({ src: url }).run();
            }
        } finally {
            setIsImageUploading(false);
            if (imageInputRef.current) {
                imageInputRef.current.value = "";
            }
        }
    };

    // content prop 변경 시 에디터 동기화 (모달 열기/닫기 대응)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) {
        return (
            <div className="rounded-md border border-gray-300 bg-gray-50 h-[240px] flex items-center justify-center text-sm text-gray-400">
                에디터 로딩 중...
            </div>
        );
    }

    return (
        <div className="tiptap-editor rounded-md border border-gray-300 overflow-hidden focus-within:ring-1 focus-within:ring-sky-500 focus-within:border-sky-500">
            {/* 툴바 */}
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                {/* 텍스트 스타일 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    title="굵게"
                >
                    <Bold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    title="기울임"
                >
                    <Italic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive("underline")}
                    title="밑줄"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* 제목 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive("heading", { level: 2 })}
                    title="제목 (H2)"
                >
                    <Heading2 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive("heading", { level: 3 })}
                    title="소제목 (H3)"
                >
                    <Heading3 className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* 정렬 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    isActive={editor.isActive({ textAlign: "left" })}
                    title="왼쪽 정렬"
                >
                    <AlignLeft className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    isActive={editor.isActive({ textAlign: "center" })}
                    title="가운데 정렬"
                >
                    <AlignCenter className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    isActive={editor.isActive({ textAlign: "right" })}
                    title="오른쪽 정렬"
                >
                    <AlignRight className="w-4 h-4" />
                </ToolbarButton>

                <Divider />

                {/* 리스트 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive("bulletList")}
                    title="불릿 리스트"
                >
                    <List className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive("orderedList")}
                    title="번호 리스트"
                >
                    <ListOrdered className="w-4 h-4" />
                </ToolbarButton>

                {/* 이미지 삽입 */}
                {onImageUpload && (
                    <>
                        <Divider />
                        <ToolbarButton
                            onClick={() => imageInputRef.current?.click()}
                            isActive={false}
                            disabled={isImageUploading}
                            title="이미지 삽입"
                        >
                            {isImageUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ImagePlus className="w-4 h-4" />
                            )}
                        </ToolbarButton>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageSelect}
                        />
                    </>
                )}

                <Divider />

                {/* 실행취소/다시실행 */}
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    isActive={false}
                    disabled={!editor.can().undo()}
                    title="실행취소"
                >
                    <Undo className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    isActive={false}
                    disabled={!editor.can().redo()}
                    title="다시실행"
                >
                    <Redo className="w-4 h-4" />
                </ToolbarButton>
            </div>

            {/* 에디터 본문 */}
            <EditorContent editor={editor} />
        </div>
    );
}

/** 툴바 버튼 */
function ToolbarButton({
    onClick,
    isActive,
    disabled,
    title,
    children,
}: {
    onClick: () => void;
    isActive: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`h-8 w-8 p-0 ${
                isActive
                    ? "bg-sky-100 text-sky-700 hover:bg-sky-200"
                    : "text-gray-600 hover:bg-gray-100"
            }`}
        >
            {children}
        </Button>
    );
}

/** 툴바 구분선 */
function Divider() {
    return <div className="w-px h-5 bg-gray-200 mx-1" />;
}
