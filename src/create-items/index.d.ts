import { ColorMaterial, Matrix4 } from '@vertexvis/vertex-api-client';

interface Source {
  /**
   * Supplied ID of scene-item provided for correlation. It is returned on
   * a scene hits and used to alter items. You may, for example, use an
   * existing ID from a PLM system.
   */
  readonly fileName: string;

  /**
   * Supplied ID of part provided for correlation. You may, for example,
   * use an existing ID from a PLM system.
   */
  readonly suppliedPartId: string;

  /**
   * Supplied ID of part-revision provided for correlation. You may, for
   * example, use an existing ID from a PLM system.
   */
  readonly suppliedRevisionId: string;
}

export interface SceneItem {
  /**
   * Depth of item in hierarchy, if uploading a single file with hierarchy
   * contained within, set to 0.
   */
  readonly depth: number;

  /**
   * Whether or not to index metadata in the part file.
   */
  readonly indexMetadata?: boolean;

  /**
   * Whether or not to use part instance supplied IDs as scene item supplied IDs.
   */
  readonly suppliedInstanceIdKey?: string;

  /**
   * Optional {@link ColorMaterial} override for item.
   */
  readonly materialOverride?: ColorMaterial;

  /**
   * Optional hierarchical parent of item.
   */
  readonly parentId?: string;

  /**
   * Optional {@link Source} geometry for item. If item is only for hierarchical
   * purposes and contains no geometry, omit.
   */
  readonly source?: Source;

  /**
   * Supplied ID of item provided for correlation. It is returned on a scene
   * hits and used to alter items. You may, for example, use the path of the
   * item in the scene starting at `/` for the root, a child at depth 3 might
   * be for example, `/11/5/6`.
   */
  readonly suppliedId: string;

  /**
   * Optional 4x4 affine transformation {@link Matrix4}. For details, see
   * @see {@link https://developer.vertexvis.com/docs/guides/rendering-scenes#transformation-matrices|Transformation Matrices}
   */
  readonly transform?: Matrix4;
}
