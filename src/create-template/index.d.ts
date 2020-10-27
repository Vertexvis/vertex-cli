import { SceneTemplateItem } from '@vertexvis/vertex-api-client';

export type ExtendedTemplateItem = SceneTemplateItem & {
  depth: number;
  fileName?: string;
  suppliedPartId: string;
  suppliedRevisionId: string;
};

export interface ExtendedSceneTemplate {
  version: '0.1';
  items: ExtendedTemplateItem[];
}
