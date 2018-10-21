import { readFileSync } from "fs";
import * as Ajv from "ajv";
var ajv = new Ajv;
var schemas = { RequestPayload: JSON.parse("{\"type\":\"object\",\"properties\":{\"vote\":{\"enum\":[\"great\",\"notGreatAtAll\",\"notThatGreat\"],\"type\":\"string\"}},\"additionalProperties\":false,\"required\":[\"vote\"],\"$schema\":\"http://json-schema.org/draft-07/schema#\"}") };
export function validate(data: any, type: keyof typeof schemas) { return ajv.validate(schemas[type], data); }