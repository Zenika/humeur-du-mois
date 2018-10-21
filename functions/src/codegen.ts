import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";

import * as typescriptJsonSchema from "typescript-json-schema";
import * as ts from "typescript";

// optionally pass argument to schema generator
const settings: typescriptJsonSchema.PartialArgs = {
  required: true,
  noExtraProps: true
};

// optionally pass ts compiler options
const compilerOptions: typescriptJsonSchema.CompilerOptions = JSON.parse(
  readFileSync(resolve("tsconfig.json")).toString()
).compilerOptions;

// optionally pass a base path
const basePath = resolve(".");

const program = typescriptJsonSchema.getProgramFromFiles(
  [resolve("src", "cast-vote.ts")],
  compilerOptions,
  basePath
);

// We can either get the schema for one file and one type...
const schema = typescriptJsonSchema.generateSchema(
  program,
  "RequestPayload",
  settings
);

writeFileSync(
  resolve("request-payload-schema.json"),
  JSON.stringify(schema, null, 2)
);

/*
Want to obtain

```
import { readFileSync } from "fs";
import * as ajv from "ajv";

const schemas = {"RequestPayload": readFileSync("request-payload-schema.json")}

function validate(data: any, type: "RequestPayload") {
  return ajv.validate(schemas[type], data);
}
```


*/

const ifs = ts.createImportDeclaration(
  undefined,
  undefined,
  ts.createImportClause(
    undefined,
    ts.createNamedImports([
      ts.createImportSpecifier(undefined, ts.createIdentifier("readFileSync"))
    ])
  ),
  ts.createLiteral("fs")
);

const iajv = ts.createImportDeclaration(
  undefined,
  undefined,
  ts.createImportClause(
    undefined,
    ts.createNamespaceImport(ts.createIdentifier("Ajv"))
  ),
  ts.createLiteral("ajv")
);

const najv = ts.createVariableStatement(
  undefined,
  ts.createVariableDeclarationList([
    ts.createVariableDeclaration(
      "ajv",
      undefined,
      ts.createNew(ts.createIdentifier("Ajv"), undefined, undefined)
    )
  ])
);

const s = ts.createVariableDeclaration(
  "schemas",
  undefined,
  ts.createObjectLiteral([
    ts.createPropertyAssignment(
      "RequestPayload",
      ts.createCall(
        ts.createPropertyAccess(ts.createIdentifier("JSON"), "parse"),
        [],
        [ts.createLiteral(JSON.stringify(schema))]
      )
    )
  ])
);

const s2 = ts.createVariableStatement(
  undefined,
  ts.createVariableDeclarationList([s])
);

const f = ts.createFunctionDeclaration(
  undefined,
  ts.createModifiersFromModifierFlags(ts.ModifierFlags.Export),
  undefined,
  "validate",
  undefined,
  [
    ts.createParameter(
      undefined,
      undefined,
      undefined,
      "data",
      undefined,
      ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
      undefined
    ),
    ts.createParameter(
      undefined,
      undefined,
      undefined,
      "type",
      undefined,
      ts.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        ts.createTypeQueryNode(ts.createIdentifier("schemas"))
      )
    )
  ],
  undefined,
  ts.createBlock([
    ts.createReturn(
      ts.createCall(
        ts.createPropertyAccess(ts.createIdentifier("ajv"), "validate"),
        undefined,
        [
          ts.createElementAccess(
            ts.createIdentifier("schemas"),
            ts.createIdentifier("type")
          ),
          ts.createIdentifier("data")
        ]
      )
    )
  ])
);

const resultFile = ts.createSourceFile(
  "someFileName.ts",
  "",
  ts.ScriptTarget.Latest,
  /*setParentNodes*/ false,
  ts.ScriptKind.TS
);
const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed
});
const result = printer.printList(
  ts.ListFormat.SourceFileStatements,
  ts.createNodeArray([ifs, iajv, najv, s2, f]),
  resultFile
);

console.log(result);

writeFileSync("src/validator.ts", result);
