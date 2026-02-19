/**
 * RichTextEditor - Tiptap 기반 리치 텍스트 에디터
 * 관리자 매거진 기사 작성/수정용
 *
 * 지원 서식: 볼드, 이탤릭, 밑줄, 제목(H2/H3),
 *           텍스트 정렬(좌/중/우), 불릿/번호 리스트, 이미지 삽입
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image";
import { Selection } from "@tiptap/pm/state";
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
    const [isDragOver, setIsDragOver] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const onImageUploadRef = useRef(onImageUpload);
    onImageUploadRef.current = onImageUpload;

    /** 이미지 파일 업로드 공통 로직 */
    const uploadAndInsertImage = useCallback(
        async (file: File, editorInstance: ReturnType<typeof useEditor>) => {
            if (!editorInstance || !onImageUploadRef.current) return;
            if (!file.type.startsWith("image/")) return;

            setIsImageUploading(true);
            try {
                const url = await onImageUploadRef.current(file);
                if (url) {
                    editorInstance.chain().focus().setImage({ src: url }).run();
                }
            } finally {
                setIsImageUploading(false);
            }
        },
        []
    );

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
        editorProps: {
            handleDrop: (view, event, _slice, moved) => {
                if (moved || !onImageUploadRef.current) return false;
                const files = event.dataTransfer?.files;
                if (!files?.length) return false;

                const file = files[0];
                if (!file.type.startsWith("image/")) return false;

                event.preventDefault();

                // 드롭 위치에 커서 이동
                const pos = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                });
                if (pos) {
                    const resolved = view.state.doc.resolve(pos.pos);
                    const sel = Selection.near(resolved);
                    view.dispatch(view.state.tr.setSelection(sel));
                }

                // 업로드 + 삽입 (editor는 아직 null일 수 있으므로 view에서 접근)
                const editorEl = view.dom.closest(".tiptap-editor");
                if (editorEl) {
                    setIsImageUploading(true);
                    onImageUploadRef.current(file).then((url) => {
                        if (url) {
                            const { tr } = view.state;
                            const imageNode = view.state.schema.nodes.image.create({ src: url });
                            const insertPos = pos ? pos.pos : view.state.selection.anchor;
                            view.dispatch(tr.insert(insertPos, imageNode));
                        }
                        setIsImageUploading(false);
                    });
                }

                return true;
            },
            handlePaste: (view, event) => {
                if (!onImageUploadRef.current) return false;
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (const item of Array.from(items)) {
                    if (item.type.startsWith("image/")) {
                        event.preventDefault();
                        const file = item.getAsFile();
                        if (!file) continue;

                        setIsImageUploading(true);
                        onImageUploadRef.current(file).then((url) => {
                            if (url) {
                                const { tr } = view.state;
                                const imageNode = view.state.schema.nodes.image.create({ src: url });
                                view.dispatch(tr.insert(view.state.selection.anchor, imageNode));
                            }
                            setIsImageUploading(false);
                        });
                        return true;
                    }
                }
                return false;
            },
        },
    });

    /** 툴바 이미지 버튼 핸들러 */
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        await uploadAndInsertImage(file, editor);
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    };

    // content prop 변경 시 에디터 동기화 (모달 열기/닫기 대응)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // 드래그 오버 시각 피드백 (에디터 컨테이너)
    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            if (!onImageUpload) return;
            e.preventDefault();
            setIsDragOver(true);
        },
        [onImageUpload]
    );

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDropOnContainer = useCallback(() => {
        setIsDragOver(false);
    }, []);

    if (!editor) {
        return (
            <div className="rounded-md border border-gray-300 bg-gray-50 h-[240px] flex items-center justify-center text-sm text-gray-400">
                에디터 로딩 중...
            </div>
        );
    }

    return (
        <div
            className={`tiptap-editor rounded-md border overflow-hidden focus-within:ring-1 focus-within:ring-sky-500 focus-within:border-sky-500 transition-colors ${
                isDragOver
                    ? "border-sky-400 bg-sky-50/50 ring-2 ring-sky-300"
                    : "border-gray-300"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropOnContainer}
        >
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

            {/* 업로드 상태 / 드래그 힌트 */}
            {isImageUploading && (
                <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border-t border-sky-200 text-xs text-sky-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    이미지 업로드 중...
                </div>
            )}
            {isDragOver && !isImageUploading && (
                <div className="flex items-center justify-center gap-2 px-3 py-3 bg-sky-50 border-t border-sky-200 text-sm text-sky-600 font-medium">
                    <ImagePlus className="w-4 h-4" />
                    여기에 놓으면 이미지가 삽입됩니다
                </div>
            )}
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
