export type InlineEditTarget =
  | {
      kind: "site_content";
      key: string;
      contentType?: "text" | "html" | "image";
    }
  | {
      kind: "site_setting";
      field: string;
    }
  | {
      kind: "entity_field";
      model: string;
      id: string;
      field: string;
    }
  | {
      kind: "product_patch";
      productId: string;
      field: string;
    };

export type InlineEditorMode =
  | "plain"
  | "multiline"
  | "html"
  | "bullets"
  | "image";

export interface InlinePreviewStyle {
  isLightOnDark?: boolean;
  color?: string;
  fontWeight?: string;
  textTransform?: string;
  letterSpacing?: string;
  fontStyle?: string;
}

export interface InlineEditorRequest {
  title: string;
  mode: InlineEditorMode;
  initialValue: string;
  initialBullets?: string[];
  target: InlineEditTarget;
  contextHint?: string;
  aspectRatio?: number;
  allowSwitchToHtml?: boolean;
  previewStyle?: InlinePreviewStyle;
  canResetToDefault?: boolean;
  onSaved?: (newValue: string, newBullets?: string[]) => void;
  onReset?: () => void;
}
