/* eslint-disable camelcase */
import {
  is4x4Identity,
  multiply,
  toFloats,
  to4x4Transform,
  toTransform,
} from '@vertexvis/vertex-api-client';
import { parse } from 'fast-xml-parser';
import { SceneItem } from '.';

interface CreateSceneItemArgs {
  readonly pathId: string;
  readonly partName: string;
  readonly partRevision: string;
  readonly fileName?: string;
  readonly transform?: number[][];
}

interface ComponentInstance {
  readonly hide_child?: string;
  readonly hide_self?: string;
  readonly id: string;
  readonly index: string;
  readonly orientation?: string;
  readonly translation?: string;
}

interface ShapeSource {
  readonly file_name: string;
}

interface Component {
  readonly component_instance?: ComponentInstance[] | ComponentInstance;
  readonly name: string;
  readonly shape_source?: ShapeSource;
  vertexIndex: number;
}

interface Property {
  readonly name: string;
  readonly value: string;
}

interface PropertyComponentRef {
  readonly property?: Property[] | Property;
}

interface SectionProperty {
  readonly property_component_ref: PropertyComponentRef[];
}

interface Properties {
  readonly properties: SectionProperty[];
  readonly revisionProperty: string;
}

// Hard-coded, update this to pull from PLM system
export const DefaultPartRevision = '1';

const PathIdSeparator = '/';

export function processPvs(
  fileData: string,
  verbose: boolean,
  root?: string,
  revisionProperty?: string
): SceneItem[] {
  const file = parse(fileData, {
    attributeNamePrefix: '',
    ignoreAttributes: false,
  }).PV_FILE;
  const components = file.section_structure.component;
  if (verbose) console.log(`Found ${components.length} components.`);

  const idx = rootIndex(components, root);
  components[idx].vertexIndex = idx;
  return createItems(
    components,
    components[idx],
    revisionProperty
      ? { properties: file.section_properties, revisionProperty }
      : undefined
  );
}

function rootIndex(components: Component[], root?: string): number {
  const defaultIdx = components.length - 1;
  if (!root) return defaultIdx;

  for (let i = 0; i < components.length; i++)
    if (components[i].name === root) return i;

  return defaultIdx;
}

function createItems(
  components: Component[],
  rootComponent: Component,
  properties?: Properties,
  transform?: number[][]
): SceneItem[] {
  const items: SceneItem[] = [];

  function recurse(
    comps: Component[],
    comp: Component,
    pathId: string,
    tran?: number[][]
  ): void {
    if (comp.component_instance) {
      const processInstance = (compInst: ComponentInstance): void => {
        if (compInst.hide_self || compInst.hide_child) return;

        const instTran = to4x4Transform(
          toFloats('1,0,0,0,1,0,0,0,1', compInst.orientation),
          toFloats('0,0,0', compInst.translation),
          1000
        );
        const idx = parseInt(compInst.index, 10);
        comps[idx].vertexIndex = idx;
        recurse(
          comps,
          comps[idx],
          `${pathId}/${compInst.id}`,
          tran ? multiply(tran, instTran) : instTran
        );
      };

      items.push(
        createSceneItem({
          pathId,
          partName: comp.name,
          partRevision: getRevisionId(comp.vertexIndex, properties),
        })
      );

      if (Array.isArray(comp.component_instance)) {
        for (const compInst of comp.component_instance)
          processInstance(compInst);
      } else processInstance(comp.component_instance);
    } else if (comp.shape_source) {
      items.push(
        createSceneItem({
          pathId,
          partName: comp.name,
          partRevision: getRevisionId(comp.vertexIndex, properties),
          fileName: comp.shape_source.file_name,
          transform: tran,
        })
      );
    }
  }

  recurse(components, rootComponent, '', transform);
  return items;
}

function createSceneItem(args: CreateSceneItemArgs): SceneItem {
  const suppliedId = args.pathId === '' ? PathIdSeparator : args.pathId;
  const pId =
    suppliedId === PathIdSeparator
      ? undefined
      : suppliedId.split(PathIdSeparator).slice(0, -1).join(PathIdSeparator);
  const parentId = pId === '' ? PathIdSeparator : pId;
  const t = args.transform;

  return {
    depth: args.pathId.split(PathIdSeparator).length - 1,
    parentId,
    source: args.fileName
      ? {
          fileName: args.fileName,
          suppliedPartId: args.partName,
          suppliedRevisionId: args.partRevision,
        }
      : undefined,
    suppliedId,
    transform: !t || is4x4Identity(t) ? undefined : toTransform(t),
  };
}

function getRevisionId(idx: number, properties?: Properties): string {
  if (!properties) return DefaultPartRevision;

  for (const sectionProp of properties.properties) {
    const propCompRef = sectionProp.property_component_ref[idx];
    if (propCompRef) {
      const prop = Array.isArray(propCompRef.property)
        ? propCompRef.property.find(
            (p) => p.name === properties.revisionProperty
          )
        : propCompRef.property &&
          propCompRef.property.name === properties.revisionProperty
        ? propCompRef.property
        : undefined;
      if (prop) return prop.value || DefaultPartRevision;
    }
  }

  return DefaultPartRevision;
}
