import test from "ava";
import { renderTemplate, StatsData, VoteData } from "./renderTemplate";
const HtmlDiffer = require("html-differ").HtmlDiffer;

test("renderTemplate", t => {
  const statsData: StatsData = {
    campaign: "2018-09",
    great: 4,
    notThatGreat: 1,
    ok: 0,
    notGreatAtAll: 0,
    total: 5
  };
  let voteData: VoteData = [
    {
      campaign: "2018-09",
      counts: statsData,
      campaignDate: "September 2018"
    }
  ];
  let htmlDiffer = new HtmlDiffer();
  const expectedResult = `
  <table>
    <tr>
      <th>Campaign</th>
      <th>😁</th><th>🙂</th><th>😐</th><th>😤</th>
      <th>Total</th>
    </tr>

        <tr>
          <td class="table__light">September 2018</td>
          <td>4</td><td>1</td><td>0</td><td>5</td>
        </tr>
  </table>
`;
  const renderedHtml = renderTemplate(voteData);
  if (htmlDiffer.isEqual(renderedHtml, expectedResult)) t.pass();
  else t.fail();
});
