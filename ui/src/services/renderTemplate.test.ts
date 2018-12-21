import test from "ava";
import { renderTemplate, StatsData, VoteData } from "./renderTemplate";
const HtmlDiffer = require("html-differ").HtmlDiffer;

test("renderTemplate", t => {
  const statsData: StatsData = {
    great: 4,
    notThatGreat: 1,
    notGreatAtAll: 0
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
      <th>😁</th><th>😐</th><th>😤</th>
    </tr>

        <tr>
          <td class="table__light">September 2018</td>
          <td>4</td><td>1</td><td>0</td>
        </tr>
  </table>
`;
  const renderedHtml = renderTemplate(voteData);
  if (htmlDiffer.isEqual(renderedHtml, expectedResult)) t.pass();
  else t.fail();
});
