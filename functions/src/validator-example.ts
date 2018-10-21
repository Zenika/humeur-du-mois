import { validate } from "./validator";

console.log(validate({}, "RequestPayload"));
console.log(validate({vote:"no"}, "RequestPayload"));
console.log(validate({vote:"great"}, "RequestPayload"));
