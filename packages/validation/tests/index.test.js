import { validateMintConfig, mintConfigSchema } from "../src";

describe("validateMintConfig", () => {
  test("returns error when missing config object", () => {
    const results = validateMintConfig(null);
    expect(results.status).toEqual("error");
    expect(results.errors.length).toEqual(1);
  });

  test("returns error when missing config object", () => {
    const results = validateMintConfig({});
    expect(results.status).toEqual("error");
    expect(results.errors.length).toEqual(1);
  });
});

describe("mintConfigSchema", () => {
  const schema = mintConfigSchema.definitions?.Schema;

  test("zod to json schema generation is successful", () => {
    expect(mintConfigSchema.$ref).toEqual("#/definitions/Schema");
    expect(schema.type).toEqual("object");
  });

  test("schema has $schema", () => {
    expect(schema.properties.$schema.default).toEqual("https://mintlify.com/schema.json");
    expect(schema.properties.$schema.type).toEqual("string");
  })

  test("schema doesn't have injected", () => {
    expect(schema.properties.__injected).toEqual(undefined);
  })
})
