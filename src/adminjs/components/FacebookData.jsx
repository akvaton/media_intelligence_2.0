import React, { useEffect } from 'react';
import set from 'lodash.set';

const FacebookData = ({ record }) => {
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
      item.lnAudienceTime,
      item.lnFacebookInteractions,
    ]);
    const selectedFragmentDataFb = fullGraphDataFb.slice(
      normalizedRecord.startIndex - 1,
      normalizedRecord.endIndex,
    );
    const fullGraphDataTwitter = graphData.map((item) => [
      item.lnAudienceTime,
      item.lnTwitterInteractions,
    ]);
    const selectedFragmentDataTwitter = fullGraphDataTwitter.slice(
      normalizedRecord.startIndex - 1,
      normalizedRecord.endIndex,
    );

    [
      {
        title: 'Full Graph Facebook',
        id: 'containerFb',
        data: fullGraphDataFb,
      },
      {
        title: 'Selected Fragment Facebook',
        id: 'selectedFragmentFb',
        data: selectedFragmentDataFb,
      },
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
          headerFormat: '<b>{series.name}</b><br/>',
          pointFormat:
            'Audience Time log = {point.x}, Interactions log = {point.y}',
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

export default FacebookData;
