import test from "ava";
import { renderTemplate, StatsData, VoteData } from "./renderTemplate";

test("renderTemplate test ok", t => {
  const statsData: StatsData = {
    great: 2,
    notThatGreat: 0,
    notGreatAtAll: 0
  };
  let voteData: VoteData = [{
    campaign: "2018-09",
    counts: statsData,
    campaign_date: "September 2018"
  }];

  t.is(
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
  );
});
