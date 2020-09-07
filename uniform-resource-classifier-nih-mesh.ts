import * as tru from "@shah/traverse-urls";
import * as ur from "@shah/uniform-resource";

export interface UntypedObject {
  readonly [key: string]: any;
}

// TODO: need to proper type this based on MeSH On Demand API response
export interface NihMeshTerm {
  readonly Term: string;
  readonly Type: "CT" | "MH"
}

export interface NihMeshClassificationResults {
  readonly MoD_Raw: {
    PRC_List: UntypedObject[],
    Term_List: NihMeshTerm[]
  }
}

export interface NihMeshNotClassifiableResource extends ur.UniformResource {
  readonly nihMeshNotClassifiableRemarks: string;
}

export function isNihMeshClassifiableResource(o: any): o is NihMeshNotClassifiableResource {
  return o && "nihMeshNotClassifiableResource" in o;
}

export interface NihMeshClassifiedResource extends ur.UniformResource {
  readonly nihMeshClassification: NihMeshClassificationResults;
}

export function isMeshClassifiedResource(o: any): o is NihMeshClassifiedResource {
  return o && "nihMeshClassification" in o;
}

export class NihMedicalSubjectHeadingsClassifier implements ur.UniformResourceTransformer {
  static readonly singleton = new NihMedicalSubjectHeadingsClassifier();

  constructor() {
  }

  async callMeshAPI(_: ur.ResourceTransformerContext, resource: ur.UniformResource, input: string): Promise<NihMeshNotClassifiableResource | NihMeshClassifiedResource> {
    const result = await tru.call("https://meshb.nlm.nih.gov/api/MOD", { input });
    if (tru.isCallResult(result)) {
      return {
        ...resource,
        nihMeshClassification: result.callResultPOJO,
      };
    } else {
      return {
        ...resource,
        nihMeshNotClassifiableRemarks: `Unable to classify: ${result.error}, ${JSON.stringify(result.postBodyPOJO)}`,
      };
    }
  }

  async flow(ctx: ur.ResourceTransformerContext, resource: ur.UniformResource): Promise<NihMeshNotClassifiableResource | NihMeshClassifiedResource> {
    if (ur.isMozillaReadabilityContent(resource)) {
      const readable = resource.mozillaReadability();
      return this.callMeshAPI(ctx, resource, readable.textContent)
    }
    if (ur.isFollowedResource(resource) && tru.isTerminalTextContentResult(resource.terminalResult)) {
      const enriched = await ur.EnrichMozillaReadabilityContent.singleton.flow(ctx, resource);
      if (ur.isMozillaReadabilityContent(enriched)) {
        const readable = enriched.mozillaReadability();
        return this.callMeshAPI(ctx, resource, readable.textContent)
      } else {
        return {
          ...resource,
          nihMeshNotClassifiableRemarks: `Unable to obtain Mozilla Readability content`,
        };
      }
    }
    return {
      ...resource,
      nihMeshNotClassifiableRemarks: `No readable text found`,
    };
  }
}
