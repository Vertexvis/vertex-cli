import { SceneTemplateItem } from '@vertexvis/vertex-api-client';

export type ExtendedTemplateItem = SceneTemplateItem & { fileName?: string };

export interface ExtendedSceneTemplate {
  version: '0.1';
  items: ExtendedTemplateItem[];
}
