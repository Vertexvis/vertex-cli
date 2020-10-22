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

// Hard-coded, update this to pull from PLM system
export const DefaultPartRevision = '1';

const rootIndex = (components: Component[], root?: string): number => {
  const defaultIdx = components.length - 1;
  if (!root) return defaultIdx;

  for (let i = 0; i < components.length; i++)
    if (components[i].name === root) return i;

  return defaultIdx;
};

const createTemplateItem = (
  args: CreateTemplateItemArgs
): ExtendedTemplateItem => {
  const suppliedId = args.pathId === '' ? '/' : args.pathId;
  const parentId =
    suppliedId === '/'
      ? undefined
      : suppliedId.split('/').slice(0, -1).join('/');
  const t = args.transform;

  return {
    fileName: args.fileName,
    name: args.partName,
    parentId: parentId === '' ? '/' : parentId,
    source: `/parts?filter[suppliedId]=${encodeURI(
      args.partName
    )}&include=part-revisions&filter[part-revisions][suppliedId]=${
      args.partRevision
    }`,
    suppliedId,
    transform: !t || is4x4Identity(t) ? undefined : toTransform(t),
  };
};

export const processPvs = (
  fileData: string,
  verbose: boolean,
  root?: string
): ExtendedTemplateItem[] => {
  const partIdToIterationId: { [k: string]: string } = {};
  const items: ExtendedTemplateItem[] = [];

  const populatePartIdToIterationIds = (sps: SectionProperty[]): void =>
    sps.forEach((sp) =>
      sp.property_component_ref.forEach((pcr) => {
        if (Array.isArray(pcr.property)) {
          const pId = pcr.property.find(
            (p) => p.name === 'part_displayIdentity'
          );
          const iId = pcr.property.find(
            (p) => p.name === 'part_iterationDisplayIdentifierSansView'
          );
          if (pId && iId) partIdToIterationId[pId.value] = iId.value;
        }
      })
    );

  const getRevisionId = (name: string): string => {
    for (const k of Object.keys(partIdToIterationId)) {
      if (k.includes(name)) return partIdToIterationId[k];
    }
    return DefaultPartRevision;
  };

  const recurse = (
    components: Component[],
    component: Component,
    pathId = '',
    transform?: number[][]
  ): void => {
    if (component.component_instance) {
      items.push(
        createTemplateItem({
          pathId,
          partName: component.name,
          partRevision: getRevisionId(component.name),
        })
      );

      const processInstance = (compInst: ComponentInstance): void => {
        if (compInst.hide_self || compInst.hide_child) return;

        const instTransform = to4x4Transform(
          toFloats('1,0,0,0,1,0,0,0,1', compInst.orientation),
          toFloats('0,0,0', compInst.translation),
          1000
        );
        recurse(
          components,
          components[parseInt(compInst.index, 10)],
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
          partRevision: getRevisionId(component.name),
          fileName: component.shape_source.file_name,
          transform,
        })
      );
    }
  };

  const file = parse(fileData, {
    attributeNamePrefix: '',
    ignoreAttributes: false,
  }).PV_FILE;
  const components = file.section_structure.component;
  if (verbose) console.log(`Found ${components.length} components.`);

  populatePartIdToIterationIds(file.section_properties);
  recurse(components, components[rootIndex(components, root)]);

  return items;
};
