export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  textAlign?: 'left' | 'center' | 'right';
  textShadow?: boolean | 'small' | 'medium' | 'large';
}

export interface Template {
  id: string;
  name: string;
  category_slug: string;
  category_name?: string;
  description: string | null;
  file_url: string;
  file_format: string;
  aspect_ratio: string;
  status: string;
}

export interface TemplateEditorProps {
  template: Template;
  onBack: () => void;
  onSave: () => void;
  continueEditing?: boolean; // If true, load saved state; if false/undefined, start fresh
}

export type ActiveProperty = 'font' | 'color' | 'size' | 'shadow' | 'format' | null;
