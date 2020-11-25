import { ColorMaterial, Matrix4 } from '@vertexvis/vertex-api-client';

export interface SceneItem {
  depth: number;
  fileName?: string;
  materialOverride?: ColorMaterial;
  parentId?: string;
  suppliedId: string;
  suppliedPartId: string;
  suppliedRevisionId: string;
  transform?: Matrix4;
}
