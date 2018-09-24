import test from "ava";
import { computeCampaignLabel } from "./computeCampaignLabel";
test("compute campaign example september 2018", t => {
  const result = computeCampaignLabel("2018-09");
  t.is(result, "September 2018");
});

test("compute campaign exemple november 2017", t => {
  const result = computeCampaignLabel("2017-11");
  t.not(result, "September 2018");
});
