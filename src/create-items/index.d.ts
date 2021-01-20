import { ColorMaterial, Matrix4 } from '@vertexvis/vertex-api-client';

interface Source {
  /**
   * Supplied ID of scene-item provided for correlation. It is returned on
   * a scene hits and used to alter items. You may, for example, use an
   * existing ID from a PLM system.
   */
  fileName: string;

  /**
   * Supplied ID of part provided for correlation. You may, for example,
   * use an existing ID from a PLM system.
   */
  suppliedPartId: string;

  /**
   * Supplied ID of part-revision provided for correlation. You may, for
   * example, use an existing ID from a PLM system.
   */
  suppliedRevisionId: string;
}

export interface SceneItem {
  /**
   * Depth of item in hierarchy, if uploading a single file with hierarchy
   * contained within, set to 0.
   */
  depth: number;

  /**
   * Whether or not to index metadata in the part file.
   */
  indexMetadata?: boolean;

  /**
   * Optional color material override for item.
   */
  materialOverride?: ColorMaterial;

  /**
   * Optional hierarchical parent of item.
   */
  parentId?: string;

  /**
   * Optional source geometry for item. If item is only for hierarchical
   * purposes and contains no geometry, omit.
   */
  source?: Source;

  /**
   * Supplied ID of item provided for correlation. It is returned on a scene
   * hits and used to alter items. You may, for example, use the path of the
   * item in the scene starting at `/` for the root, a child at depth 3 might
   * be for example, `/11/5/6`.
   */
  suppliedId: string;

  /**
   * Optional 4x4 affine transformation matrix. For details, see
   * https://developer.vertexvis.com/docs/guides/rendering-scenes#transformation-matrices
   */
  transform?: Matrix4;
}
