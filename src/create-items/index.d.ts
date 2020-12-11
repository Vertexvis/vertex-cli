import { ColorMaterial, Matrix4 } from '@vertexvis/vertex-api-client';

interface Source {
  fileName: string;
  suppliedPartId: string;
  suppliedRevisionId: string;
}

export interface SceneItem {
  depth?: number;
  materialOverride?: ColorMaterial;
  parentId?: string;
  source?: Source;
  suppliedId: string;
  transform?: Matrix4;
}
