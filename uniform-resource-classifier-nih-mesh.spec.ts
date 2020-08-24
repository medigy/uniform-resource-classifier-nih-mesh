import * as p from "@shah/ts-pipe";
import * as ur from "@shah/uniform-resource";
import { Expect, Test, TestFixture, Timeout } from "alsatian";
import * as urMeSH from "./uniform-resource-classifier-nih-mesh";

@TestFixture("Uniform Resource Test Suite")
export class TestSuite {
    @Timeout(60000)
    @Test("Test a MeSH API Call")
    async testMeshApiCall(): Promise<void> {
        const tr = p.pipe(new ur.FollowRedirectsGranular(), urMeSH.NihMedicalSubjectHeadingsClassifier.singleton);
        const resource = await ur.acquireResource({ uri: "https://www.cnn.com/2020/07/30/investing/teladoc-earnings/index.html", transformer: tr });
        Expect(resource).toBeDefined();
        Expect(urMeSH.isMeshClassifiedResource(resource)).toBe(true);
        if (urMeSH.isMeshClassifiedResource(resource)) {
            Expect(resource.nihMeshClassification.MoD_Raw.Term_List.length).toBeGreaterThan(0);
        }
    }
}
