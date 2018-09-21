import test from "ava";
import { computeCampaign } from "./computeCampaign";
test("test compute campaign work", t => {
  const result = computeCampaign("2018-09");
  t.is(result, "September 2018");
});

test("test compute campaign doesn't work", t => {
  const result = computeCampaign("2018-09");
  t.not(result, "September 2017");
});
