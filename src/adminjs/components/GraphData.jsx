import React, { useEffect } from 'react';
import set from 'lodash.set';

const GraphData = ({ record }) => {
  useEffect(() => {
    const normalizedRecord = Object.entries(record.params).reduce(
      (acc, [key, value]) => {
        set(acc, key, value);
        return acc;
      },
      {},
    );
    const { graphData } = normalizedRecord;
    const fullGraphDataFb = graphData.map((item) => [
      item.audienceTime,
      item.facebook,
    ]);
    const selectedFragmentDataFb = fullGraphDataFb.slice(
      normalizedRecord.facebookStartIndex - 1,
      normalizedRecord.facebookEndIndex,
    );
    const fullGraphDataTwitter = graphData.map((item) => [
      item.audienceTime,
      item.twitter,
    ]);
    const selectedFragmentDataTwitter = fullGraphDataTwitter.slice(
      normalizedRecord.twitterStartIndex - 1,
      normalizedRecord.twitterEndIndex,
    );

    [
      // {
      //   title: 'Full Graph Facebook',
      //   id: 'containerFb',
      //   data: fullGraphDataFb,
      // },
      // {
      //   title: 'Selected Fragment Facebook',
      //   id: 'selectedFragmentFb',
      //   data: selectedFragmentDataFb,
      // },
      {
        title: 'Full Graph Twitter',
        id: 'containerTwitter',
        data: fullGraphDataTwitter,
      },
      {
        title: 'Selected Fragment Twitter',
        id: 'selectedFragmentTwitter',
        data: selectedFragmentDataTwitter,
      },
    ].forEach(({ title, id, data }) => {
      window.Highcharts.chart(id, {
        title: { text: title },
        yAxis: { title: { text: 'Interactions log' }, min: 0 },
        xAxis: {
          title: { text: 'Audience Time log' },
          min: Math.min(...data.map(([x]) => x)),
          tickInterval: 1,
        },
        tooltip: {
          headerFormat: '',
          pointFormatter: function () {
            return `<b>${this.index + 1}</b> <br/> Audience Time log = ${
              this.x
            }, Interactions log = ${this.y}`;
          },
        },
        series: [{ name: '', data, keys: ['x', 'y'] }],
        plotOptions: { series: { marker: { enabled: true } } },
      });
    });
  }, []);

  return (
    <div>
      <div id="containerFb" />
      <div id="selectedFragmentFb" />
      <div id="containerTwitter" />
      <div id="selectedFragmentTwitter" />
    </div>
  );
};

export default GraphData;
