import test from "ava";
import { renderTemplate, StatsData, VoteData } from "./renderTemplate";

var HtmlDiffer = require('html-differ').HtmlDiffer;

test("renderTemplate test ok", t => {
  const statsData: StatsData = {
    great: 4,
    notThatGreat: 1,
    notGreatAtAll: 0
  };
  let voteData: VoteData = [{
    campaign: "2018-09",
    counts: statsData,
    campaign_date: "September 2018"
  }];
  let htmlDiffer = new HtmlDiffer();
  const expectedResult = `
  <table>
    <tr>
      <th>Campaign</th>
      <th>😁</th><th>😐</th><th>😤</th>
    </tr>

        <tr>
          <td>September 2018</td>
          <td>4</td><td>1</td><td>0</td>
        </tr>
  </table>
`;
const renderedHtml = renderTemplate(voteData)
console.info(renderedHtml)
console.info(expectedResult)
  if(htmlDiffer.isEqual(renderedHtml, expectedResult))
    t.pass();
  else t.fail();
  /*t.is(
    renderTemplate(voteData),`
      <table>
        <tr>
          <th>Campaign</th>
          <th>😁</th><th>😐</th><th>😤</th>
        </tr>

            <tr>
              <td>August 2018</td>
              <td>2</td><td>0</td><td>0</td>
            </tr>

            <tr>
              <td>September 2018</td>
              <td>4</td><td>1</td><td>0</td>
            </tr>
      </table>
    `
  );*/
});
