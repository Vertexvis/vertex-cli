/* eslint-disable camelcase */
import {
  is4x4Identity,
  multiply,
  toFloats,
  to4x4Transform,
  toTransform,
} from '@vertexvis/vertex-api-client';
import { parse } from 'fast-xml-parser';
import { ExtendedTemplateItem } from '.';

interface CreateTemplateItemArgs {
  pathId: string;
  partName: string;
  partRevision: string;
  fileName?: string;
  transform?: number[][];
}

interface ComponentInstance {
  hide_child?: string;
  hide_self?: string;
  id: string;
  index: string;
  orientation?: string;
  translation?: string;
}

interface ShapeSource {
  file_name: string;
}

interface Component {
  component_instance?: ComponentInstance[] | ComponentInstance;
  name: string;
  shape_source?: ShapeSource;
  vertexIndex: number;
}

interface Property {
  name: string;
  value: string;
}

interface PropertyComponentRef {
  property?: Property[] | Property;
}

interface SectionProperty {
  property_component_ref: PropertyComponentRef[];
}

interface Properties {
  properties: SectionProperty[];
  revisionProperty: string;
}

// Hard-coded, update this to pull from PLM system
export const DefaultPartRevision = '1';

const PathIdSeparator = '/';

export function processPvs(
  fileData: string,
  verbose: boolean,
  root?: string,
  revisionProperty?: string
): ExtendedTemplateItem[] {
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
  properties?: Properties
): ExtendedTemplateItem[] {
  const items: ExtendedTemplateItem[] = [];

  function recurse(
    components: Component[],
    component: Component,
    pathId = '',
    transform?: number[][]
  ): void {
    if (component.component_instance) {
      items.push(
        createTemplateItem({
          pathId,
          partName: component.name,
          partRevision: getRevisionId(component.vertexIndex, properties),
        })
      );

      const processInstance = (compInst: ComponentInstance): void => {
        if (compInst.hide_self || compInst.hide_child) return;

        const instTransform = to4x4Transform(
          toFloats('1,0,0,0,1,0,0,0,1', compInst.orientation),
          toFloats('0,0,0', compInst.translation),
          1000
        );
        const idx = parseInt(compInst.index, 10);
        components[idx].vertexIndex = idx;
        recurse(
          components,
          components[idx],
          `${pathId}/${compInst.id}`,
          transform ? multiply(transform, instTransform) : instTransform
        );
      };

      if (Array.isArray(component.component_instance)) {
        for (const compInst of component.component_instance)
          processInstance(compInst);
      } else processInstance(component.component_instance);
    } else if (component.shape_source) {
      items.push(
        createTemplateItem({
          pathId,
          partName: component.name,
          partRevision: getRevisionId(component.vertexIndex, properties),
          fileName: component.shape_source.file_name,
          transform,
        })
      );
    }
  }

  recurse(components, rootComponent);
  return items;
}

function createTemplateItem(
  args: CreateTemplateItemArgs
): ExtendedTemplateItem {
  const suppliedId = args.pathId === '' ? PathIdSeparator : args.pathId;
  const parentId =
    suppliedId === PathIdSeparator
      ? undefined
      : suppliedId.split(PathIdSeparator).slice(0, -1).join(PathIdSeparator);
  const t = args.transform;

  return {
    depth: args.pathId.split(PathIdSeparator).length - 1,
    fileName: args.fileName,
    suppliedPartId: args.partName,
    suppliedRevisionId: args.partRevision,
    parentId: parentId === '' ? PathIdSeparator : parentId,
    source: `/parts?filter[suppliedId]=${encodeURIComponent(
      args.partName
    )}&include=part-revisions&filter[part-revisions][suppliedId]=${encodeURIComponent(
      args.partRevision
    )}`,
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
