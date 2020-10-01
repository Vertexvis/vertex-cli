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

// Hard-coded, update this to pull from PLM system
export const DefaultPartRevision = '1';

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
  verbose: boolean
): ExtendedTemplateItem[] => {
  const items: ExtendedTemplateItem[] = [];

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
          partRevision: DefaultPartRevision,
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
          partRevision: DefaultPartRevision,
          fileName: component.shape_source.file_name,
          transform,
        })
      );
    }
  };

  const components = parse(fileData, {
    attributeNamePrefix: '',
    ignoreAttributes: false,
  }).PV_FILE.section_structure.component;
  if (verbose) console.log(`Found ${components.length} components.`);

  recurse(components, components[components.length - 1]);

  return items;
};
